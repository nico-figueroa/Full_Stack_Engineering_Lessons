import { expect } from "chai";
import { resolveSslCa } from "../src/config/db.js";

describe("resolveSslCa", () => {
  const pem = "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n";

  it("reads the CA from DATABASE_SSL_CA_FILE", () => {
    const ca = resolveSslCa({ DATABASE_SSL_CA_FILE: "/etc/secrets/prod-ca-2021.crt" }, path => {
      expect(path).to.equal("/etc/secrets/prod-ca-2021.crt");
      return pem;
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
