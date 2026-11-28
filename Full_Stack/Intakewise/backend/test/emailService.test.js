import { expect } from "chai";
import {
  emailDeliveryIsConfigured,
  sendTransactionalEmail,
} from "../src/services/emailService.js";

describe("email service", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.fetch = originalFetch;
    for (const key of [
      "BREVO_API_KEY",
      "BREVO_API_URL",
      "EMAIL_DELIVERY_TIMEOUT_MS",
      "NODE_ENV",
      "SMTP_FROM",
      "SMTP_HOST",
    ]) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("sends Brevo messages over HTTPS when an API key is configured", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_API_URL = "https://email.example.test/v1/transactional";
    process.env.SMTP_FROM = "Intakewise <security@example.com>";
    process.env.EMAIL_DELIVERY_TIMEOUT_MS = "12000";
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ messageId: "message-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await sendTransactionalEmail({
      to: "person@example.com",
      subject: "Security code",
      text: "Use 123456",
      html: "<p>Use 123456</p>",
    });

    expect(emailDeliveryIsConfigured()).to.equal(true);
    expect(request.url).to.equal("https://email.example.test/v1/transactional");
    expect(request.options.headers["api-key"]).to.equal("test-api-key");
    expect(JSON.parse(request.options.body)).to.deep.include({
      sender: { email: "security@example.com", name: "Intakewise" },
      to: [{ email: "person@example.com" }],
      subject: "Security code",
    });
    expect(result).to.deep.equal({ messageId: "message-1" });
  });

  it("returns a service-unavailable error when Brevo rejects a request", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.SMTP_FROM = "security@example.com";
    global.fetch = async () => new Response(JSON.stringify({ message: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await sendTransactionalEmail({
        to: "person@example.com",
        subject: "Security code",
        text: "Use 123456",
        html: "<p>Use 123456</p>",
      });
      throw new Error("Expected email delivery to fail");
    } catch (error) {
      expect(error.message).to.equal("Email delivery failed");
      expect(error.status).to.equal(503);
      expect(error.cause.message).to.include("status 401");
    }
  });

  it("rejects an invalid external API URL without making a request", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_API_URL = "file:///tmp/brevo";
    process.env.SMTP_FROM = "security@example.com";
    global.fetch = async () => {
      throw new Error("fetch should not be called");
    };

    try {
      await sendTransactionalEmail({
        to: "person@example.com",
        subject: "Security code",
        text: "Use 123456",
        html: "<p>Use 123456</p>",
      });
      throw new Error("Expected email delivery to fail");
    } catch (error) {
      expect(error.message).to.equal("Email delivery failed");
      expect(error.cause.message).to.equal("BREVO_API_URL must use http or https");
    }
  });
});
