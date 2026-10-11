import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { expect } from "chai";
import app, { apiRouters } from "../src/server.js";

const specPath = new URL("../openapi.json", import.meta.url);
const openApi = JSON.parse(await readFile(specPath, "utf8"));
const supportedMethods = new Set(["get", "post", "put", "delete"]);
const pathParameters = path => [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
const normalizePath = path => path.replace(/:([^/]+)/g, "{$1}").replace(/\/+/g, "/");
let server;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function actualRoutes() {
  const routes = new Set();
  const layers = app.router?.stack || app._router?.stack || [];

  for (const layer of layers) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const path of paths) {
        for (const method of supportedMethods) {
          if (layer.route.methods[method]) routes.add(`${method.toUpperCase()} ${normalizePath(path)}`);
        }
      }
    }
  }

  for (const [prefix, router] of apiRouters) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const path of paths) {
        const fullPath = normalizePath(`${prefix}${path === "/" ? "" : path}`);
        for (const method of supportedMethods) {
          if (layer.route.methods[method]) routes.add(`${method.toUpperCase()} ${fullPath}`);
        }
      }
    }
  }
  return routes;
}

function resolveReference(reference) {
  expect(reference).to.match(/^#\//);
  return reference.slice(2).split("/").reduce((value, part) => value?.[part.replace(/~1/g, "/").replace(/~0/g, "~")], openApi);
}

function validateSchema(schema, references = new Set()) {
  expect(schema).to.be.an("object");
  if (schema.$ref) {
    const target = resolveReference(schema.$ref);
    expect(target, `unresolved schema reference ${schema.$ref}`).to.exist;
    if (!references.has(schema.$ref)) {
      const nextReferences = new Set(references);
      nextReferences.add(schema.$ref);
      validateSchema(target, nextReferences);
    }
    return;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    expect(types).to.satisfy(values => values.every(type => ["array", "boolean", "integer", "null", "number", "object", "string"].includes(type)));
  }
  if (schema.properties) {
    expect(schema.properties).to.be.an("object");
    for (const value of Object.values(schema.properties)) validateSchema(value, references);
  }
  if (schema.required) {
    expect(schema.required).to.be.an("array");
    for (const name of schema.required) {
      expect(schema.properties, `required property ${name} has no properties object`).to.be.an("object");
      expect(schema.properties).to.have.property(name);
    }
  }
  if (schema.items) validateSchema(schema.items, references);
  for (const keyword of ["allOf", "anyOf", "oneOf"]) {
    if (schema[keyword]) {
      expect(schema[keyword]).to.be.an("array").that.is.not.empty;
      schema[keyword].forEach(value => validateSchema(value, references));
    }
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    validateSchema(schema.additionalProperties, references);
  }
}

function operationParameters(path, operation) {
  const parameters = [...(openApi.paths[path].parameters || []), ...(operation.parameters || [])]
    .map(parameter => parameter.$ref ? resolveReference(parameter.$ref) : parameter);
  return parameters;
}

describe("OpenAPI contract", () => {
  it("serves Swagger UI as the default route and exposes the checked-in spec", async () => {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const [documentation, specification, health, swaggerCss, swaggerBundle] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/openapi.json`),
      fetch(`${baseUrl}/health`),
      fetch(`${baseUrl}/swagger-ui.css`),
      fetch(`${baseUrl}/swagger-ui-bundle.js`),
    ]);
    expect(documentation.status).to.equal(200);
    expect(await documentation.text()).to.include("swagger-ui");
    expect(specification.status).to.equal(200);
    expect((await specification.json()).openapi).to.equal("3.1.0");
    expect(health.status).to.equal(200);
    expect(await health.json()).to.deep.equal({ status: "ok" });
    expect(swaggerCss.status).to.equal(200);
    expect(swaggerBundle.status).to.equal(200);
  });

  it("declares exactly the Express routes and supported HTTP methods", () => {
    const declared = new Set();
    for (const [path, pathItem] of Object.entries(openApi.paths)) {
      for (const method of supportedMethods) {
        if (pathItem[method]) declared.add(`${method.toUpperCase()} ${normalizePath(path)}`);
      }
    }
    const actual = actualRoutes();
    expect([...declared].sort()).to.deep.equal([...actual].sort());
  });

  it("matches path and required query parameters for each route", () => {
    const actual = actualRoutes();
    for (const [path, pathItem] of Object.entries(openApi.paths)) {
      for (const method of supportedMethods) {
        const operation = pathItem[method];
        if (!operation) continue;
        const routeKey = `${method.toUpperCase()} ${normalizePath(path)}`;
        expect(actual.has(routeKey), routeKey).to.equal(true);
        const parameters = operationParameters(path, operation);
        const declaredPathParameters = parameters.filter(parameter => parameter.in === "path" && parameter.required).map(parameter => parameter.name).sort();
        expect(declaredPathParameters, routeKey).to.deep.equal(pathParameters(path));
        expect(parameters.filter(parameter => parameter.in === "path").every(parameter => parameter.required), routeKey).to.equal(true);
        for (const parameter of parameters) {
          expect(parameter.schema, `${routeKey} parameter ${parameter.name} requires a schema`).to.be.an("object");
          validateSchema(parameter.schema);
        }
      }
    }
    expect(operationParameters("/api/schedule", openApi.paths["/api/schedule"].get)
      .filter(parameter => parameter.in === "query" && parameter.required)
      .map(parameter => parameter.name).sort()).to.deep.equal(["from", "to"]);
  });

  it("provides structurally valid success response schemas and resolvable references", () => {
    for (const [path, pathItem] of Object.entries(openApi.paths)) {
      for (const method of supportedMethods) {
        const operation = pathItem[method];
        if (!operation) continue;
        expect(operation.responses, `${method.toUpperCase()} ${path} needs responses`).to.be.an("object").that.is.not.empty;
        const successResponses = Object.entries(operation.responses).filter(([status]) => /^2\d\d$/.test(status));
        expect(successResponses, `${method.toUpperCase()} ${path} needs a success response`).not.to.be.empty;
        if (operation.requestBody) {
          const requestBody = operation.requestBody.$ref ? resolveReference(operation.requestBody.$ref) : operation.requestBody;
          expect(requestBody, `${method.toUpperCase()} ${path} request body must resolve`).to.exist;
          expect(requestBody.required, `${method.toUpperCase()} ${path} request body must be required`).to.equal(true);
          expect(requestBody.content).to.be.an("object");
          for (const media of Object.values(requestBody.content)) validateSchema(media.schema);
        }
        for (const [status, responseOrReference] of Object.entries(operation.responses)) {
          const response = responseOrReference.$ref ? resolveReference(responseOrReference.$ref) : responseOrReference;
          expect(response, `${method.toUpperCase()} ${path} response ${status} must resolve`).to.exist;
          if (response.content) {
            for (const media of Object.values(response.content)) validateSchema(media.schema);
          }
        }
        for (const parameter of operationParameters(path, operation)) {
          expect(parameter.schema, `${method.toUpperCase()} ${path} parameter ${parameter.name}`).to.exist;
        }
      }
    }
  });
});
