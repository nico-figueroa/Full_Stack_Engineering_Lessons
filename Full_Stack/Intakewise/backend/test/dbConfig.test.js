import { expect } from "chai";
import pool, { resolveSslCa } from "../src/config/db.js";

describe("resolveSslCa", () => {
  const pem = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n";

  it("reads the CA from DATABASE_SSL_CA_FILE", () => {
    const ca = resolveSslCa({ DATABASE_SSL_CA_FILE: "/etc/secrets/prod-ca-2021.crt" }, path => {
      expect(path).to.equal("/etc/secrets/prod-ca-2021.crt");
      return pem;
    });

    describe("database schema initialization", () => {
      it("initializes every new client before checking its active schema", async () => {
        for (let i = 0; i < 2; i++) {
          const queries = [];
          let finishSetup;
          const setup = new Promise(resolve => { finishSetup = resolve; });
          const client = {
            async query(sql) {
              queries.push(sql);
              if (queries.length === 1) return setup;
              return { rows: [{ schema: "intakewise" }] };
            },
          };
          const initialized = pool.options.onConnect(client);
          expect(queries).to.deep.equal(["SET search_path TO intakewise, public"]);
          finishSetup();
          await initialized;
          expect(queries).to.deep.equal([
            "SET search_path TO intakewise, public",
            "SELECT current_schema() AS schema",
          ]);
        }
      });

      it("propagates setup errors", async () => {
        const failure = new Error("connection lost");
        const client = { async query() { throw failure; } };
        const error = await pool.options.onConnect(client).then(() => null, caught => caught);
        expect(error).to.equal(failure);
      });

      for (const schema of ["public", null]) {
        it(`rejects fallback to schema ${schema}`, async () => {
          const client = { async query() { return { rows: [{ schema }] }; } };
          const error = await pool.options.onConnect(client).then(() => null, caught => caught);
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal("Database schema intakewise is missing or inaccessible");
        });
      }
    });
    expect(ca).to.equal(pem);
  });

  it("prefers the file over inline PEM text", () => {
    const ca = resolveSslCa({ DATABASE_SSL_CA_FILE: "ca.crt", DATABASE_SSL_CA: "inline" }, () => pem);
    expect(ca).to.equal(pem);
  });

  it("throws a descriptive error when the file is unreadable", () => {
    const missing = () => { throw new Error("ENOENT"); };
    expect(() => resolveSslCa({ DATABASE_SSL_CA_FILE: "missing.crt" }, missing))
      .to.throw("Unable to read DATABASE_SSL_CA_FILE at missing.crt");
  });

  it("converts escaped newlines in inline PEM text", () => {
    expect(resolveSslCa({ DATABASE_SSL_CA: "line1\\nline2" })).to.equal("line1\nline2");
  });

  it("returns undefined when no CA is configured", () => {
    expect(resolveSslCa({})).to.equal(undefined);
  });
});
