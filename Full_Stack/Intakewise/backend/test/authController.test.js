import { expect } from "chai";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../src/config/db.js";
import { createHash } from "node:crypto";
import { forgotPassword, login, refresh, register, resetPassword } from "../src/controllers/authController.js";

describe("authentication controllers", () => {
  let originalQuery;
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    originalQuery = pool.query;
    process.env.JWT_SECRET = "test-secret-long-enough-to-satisfy-thirty-two-characters";
  });
  afterEach(() => {
    pool.query = originalQuery;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("registers a regular user with a hashed password and fresh tokens", async () => {
    const calls = [];
    pool.query = async (query, values) => {
      calls.push({ query, values });
      if (query.includes("INSERT INTO users")) return { rows: [{ id: 7, email: "user@example.com", role: "user" }] };
      return { rows: [], rowCount: 1 };
    };
    const response = createResponse();
    await register({ body: { email: "User@Example.com", password: "secret-password", name: "User" } }, response);

    expect(response.statusCode).to.equal(201);
    expect(calls[0].values[0]).to.equal("user@example.com");
    expect(await bcrypt.compare("secret-password", calls[0].values[1])).to.equal(true);
    expect(response.payload).to.have.property("accessToken");
    expect(jwt.verify(response.payload.refreshToken, process.env.JWT_SECRET).tokenType).to.equal("refresh");
  });

  it("rejects invalid credentials without querying the database", async () => {
    pool.query = async () => { throw new Error("should not query"); };
    try {
      await login({ body: { email: "not-an-email", password: "short" } }, createResponse());
      throw new Error("Expected input validation to fail");
    } catch (error) {
      expect(error.name).to.equal("ZodError");
    }
  });

  it("rotates only an active refresh session", async () => {
    const originalRefresh = jwt.sign(
      { id: 7, email: "user@example.com", role: "user", tokenType: "refresh" },
      process.env.JWT_SECRET,
      { expiresIn: "7d", jwtid: "b80ab6a6-e242-4d14-83cf-8b92c321808f" }
    );
    pool.query = async query => {
      if (query.includes("JOIN auth_sessions")) return { rows: [{ id: 7, email: "user@example.com", role: "user" }] };
      if (query.startsWith("UPDATE auth_sessions")) return { rowCount: 1 };
      return { rows: [], rowCount: 1 };
    };
    const response = createResponse();
    await refresh({ body: { refreshToken: originalRefresh } }, response);
    expect(response.payload.refreshToken).not.to.equal(originalRefresh);
    expect(jwt.verify(response.payload.refreshToken, process.env.JWT_SECRET).tokenType).to.equal("refresh");
  });
  describe("password reset", () => {
    const originalEnv = { ...process.env };
    let originalInfo;
    beforeEach(() => {
      originalInfo = console.info;
      console.info = () => {};
      process.env.CLIENT_ORIGIN = "http://app.test,http://other.test";
      delete process.env.PASSWORD_RESET_URL_BASE;
      delete process.env.PASSWORD_RESET_EXPOSE_LINK;
      process.env.NODE_ENV = "test";
    });
    afterEach(() => {
      console.info = originalInfo;
      for (const key of ["CLIENT_ORIGIN", "PASSWORD_RESET_URL_BASE", "PASSWORD_RESET_EXPOSE_LINK", "NODE_ENV"]) {
        if (originalEnv[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[key];
      }
    });

    it("returns a generic response without issuing a token for unknown emails", async () => {
      const calls = [];
      pool.query = async (query, values) => { calls.push({ query, values }); return { rows: [] }; };
      const response = createResponse();
      await forgotPassword({ body: { email: "Nobody@Example.com" } }, response);
      expect(calls).to.have.length(1);
      expect(calls[0].values).to.deep.equal(["nobody@example.com"]);
      expect(response.payload).to.have.property("message");
      expect(response.payload).not.to.have.property("resetUrl");
    });

    it("stores only a hash of the token and exposes the link outside production", async () => {
      const calls = [];
      pool.query = async (query, values) => {
        calls.push({ query, values });
        if (query.startsWith("SELECT id FROM users")) return { rows: [{ id: 7 }] };
        if (query.includes("INSERT INTO password_reset_tokens")) return { rows: [{ expires_at: "2030-01-01T00:00:00Z" }] };
        return { rows: [], rowCount: 1 };
      };
      const response = createResponse();
      await forgotPassword({ body: { email: "user@example.com" } }, response);

      const url = new URL(response.payload.resetUrl);
      expect(url.origin).to.equal("http://app.test");
      expect(url.pathname).to.equal("/reset-password");
      const token = url.searchParams.get("token");
      const insert = calls.find(call => call.query.includes("INSERT INTO password_reset_tokens"));
      expect(insert.values[1]).to.equal(createHash("sha256").update(token).digest("hex"));
      expect(insert.values).not.to.include(token);
      expect(calls.some(call => call.query.startsWith("UPDATE password_reset_tokens SET used_at"))).to.equal(true);
    });

    it("hides the reset link in production unless explicitly enabled", async () => {
      process.env.NODE_ENV = "production";
      pool.query = async query => {
        if (query.startsWith("SELECT id FROM users")) return { rows: [{ id: 7 }] };
        return { rows: [{ expires_at: "2030-01-01T00:00:00Z" }], rowCount: 1 };
      };
      const hidden = createResponse();
      await forgotPassword({ body: { email: "user@example.com" } }, hidden);
      expect(hidden.payload).not.to.have.property("resetUrl");

      process.env.PASSWORD_RESET_EXPOSE_LINK = "true";
      const shown = createResponse();
      await forgotPassword({ body: { email: "user@example.com" } }, shown);
      expect(shown.payload.resetUrl).to.match(/^http:\/\/app\.test\/reset-password\?token=/);
    });

    it("updates the password and revokes sessions for a valid token", async () => {
      const calls = [];
      pool.query = async (query, values) => { calls.push({ query, values }); return { rows: [{ id: 7 }] }; };
      const response = createResponse();
      const token = "a".repeat(43);
      await resetPassword({ body: { token, password: "brand-new-password" } }, response);

      expect(response.statusCode).to.equal(200);
      expect(calls).to.have.length(1);
      expect(calls[0].query).to.include("UPDATE auth_sessions");
      expect(calls[0].values[0]).to.equal(createHash("sha256").update(token).digest("hex"));
      expect(await bcrypt.compare("brand-new-password", calls[0].values[1])).to.equal(true);
    });

    it("rejects expired, used, or unknown tokens", async () => {
      pool.query = async () => ({ rows: [] });
      const response = createResponse();
      await resetPassword({ body: { token: "b".repeat(43), password: "brand-new-password" } }, response);
      expect(response.statusCode).to.equal(400);
      expect(response.payload.error).to.match(/invalid or has expired/);
    });

    it("validates the new password before touching the database", async () => {
      pool.query = async () => { throw new Error("should not query"); };
      try {
        await resetPassword({ body: { token: "c".repeat(43), password: "short" } }, createResponse());
        throw new Error("Expected validation to fail");
      } catch (error) {
        expect(error.name).to.equal("ZodError");
      }
    });
  });
});

function createResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}
