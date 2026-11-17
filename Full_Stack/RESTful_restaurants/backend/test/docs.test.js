const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const document = require("../openapi.json");

process.env.SUPABASE_URL = "https://docs-test.supabase.co";
process.env.SUPABASE_SECRET_KEY = "test-server-key";
const app = require("../app");
let server;
let origin;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
}));

test("API root serves Swagger UI with local assets and the full specification", async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /RESTful Restaurants API Documentation/);

  const script = await fetch(`${origin}/swagger-ui-init.js`);
  assert.equal(script.status, 200);
  assert.match(await script.text(), /RESTful Restaurants API/);
  for (const asset of ["/swagger-ui.css", "/swagger-ui-bundle.js"]) {
    assert.equal((await fetch(`${origin}${asset}`)).status, 200);
  }
  const alias = await fetch(`${origin}/api-docs`, { redirect: "manual" });
  assert.equal(alias.status, 302);
  assert.equal(alias.headers.get("location"), "/");
});

test("health and OpenAPI endpoints are public and support frontend CORS", async () => {
  const health = await fetch(`${origin}/health`, {
    headers: { Origin: "https://frontend.example.test" },
  });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await health.json(), { status: "ok" });

  const response = await fetch(`${origin}/openapi.json`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), document);
});

test("specification covers all resource operations and resolves local references", () => {
  const expected = {
    "/restaurants": ["get", "post"],
    "/restaurants/{id}": ["get", "put", "delete"],
    "/restaurants/starred": ["get", "post"],
    "/restaurants/starred/{id}": ["get", "put", "delete"],
    "/categories": ["get", "post"],
    "/categories/{id}": ["get", "put", "delete"],
    "/categories/{id}/assign": ["post"],
    "/categories/{id}/remove": ["post"],
  };
  const operationIds = new Set();
  for (const [path, methods] of Object.entries(expected)) {
    for (const method of methods) {
      const operation = document.paths[path][method];
      assert.ok(operation, `${method} ${path}`);
      assert.ok(!operationIds.has(operation.operationId));
      operationIds.add(operation.operationId);
      assert.ok(Object.keys(operation.responses).some(status => /^2\d\d$/.test(status)));
    }
  }
  function checkReferences(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      const target = value.$ref.slice(2).split("/").reduce((object, key) => object?.[key], document);
      assert.ok(target, `Unresolved reference: ${value.$ref}`);
    }
    Object.values(value).forEach(checkReferences);
  }
  checkReferences(document);
});

test("Swagger middleware preserves resource routes and their validation contracts", async () => {
  for (const [path, method, body] of [
    ["/restaurants", "POST", {}],
    ["/restaurants/example", "PUT", { name: "wrong field" }],
    ["/restaurants/starred", "POST", {}],
    ["/restaurants/starred/example", "PUT", {}],
    ["/categories", "POST", {}],
    ["/categories/example", "PUT", {}],
    ["/categories/example/assign", "POST", {}],
    ["/categories/example/remove", "POST", {}],
  ]) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400, `${method} ${path}`);
    assert.equal(typeof (await response.json()).error, "string");
  }
});
