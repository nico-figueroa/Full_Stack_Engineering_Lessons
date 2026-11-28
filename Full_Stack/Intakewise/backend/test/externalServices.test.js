import { expect } from "chai";
import {
  dailyMedWebUrl,
  externalServiceUrl,
  publicDataRequestTimeoutMs,
  publicDataToolName,
} from "../src/config/externalServices.js";

describe("external service configuration", () => {
  const originalEnv = { ...process.env };
  const keys = [
    "DAILYMED_WEB_BASE_URL",
    "OPENFDA_API_URL",
    "PUBLIC_DATA_REQUEST_TIMEOUT_MS",
    "PUBLIC_DATA_TOOL_NAME",
  ];

  afterEach(() => {
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("builds external provider paths from environment overrides", () => {
    process.env.DAILYMED_WEB_BASE_URL = "https://labels.example.test/dailymed/";
    process.env.OPENFDA_API_URL = "https://fda.example.test/label";

    expect(dailyMedWebUrl("drugInfo.cfm"))
      .to.equal("https://labels.example.test/dailymed/drugInfo.cfm");
    expect(externalServiceUrl("OPENFDA_API_URL"))
      .to.equal("https://fda.example.test/label");
  });

  it("uses validated timeout and provider identity overrides", () => {
    process.env.PUBLIC_DATA_REQUEST_TIMEOUT_MS = "12500";
    process.env.PUBLIC_DATA_TOOL_NAME = "intakewise-production";

    expect(publicDataRequestTimeoutMs()).to.equal(12500);
    expect(publicDataToolName()).to.equal("intakewise-production");
  });

  it("falls back for invalid numeric and empty identity settings", () => {
    process.env.PUBLIC_DATA_REQUEST_TIMEOUT_MS = "-1";
    process.env.PUBLIC_DATA_TOOL_NAME = "  ";

    expect(publicDataRequestTimeoutMs()).to.equal(8000);
    expect(publicDataToolName()).to.equal("intakewise");
  });

  it("rejects non-HTTP external service URLs", () => {
    process.env.OPENFDA_API_URL = "file:///tmp/openfda";
    expect(() => externalServiceUrl("OPENFDA_API_URL"))
      .to.throw("OPENFDA_API_URL must use http or https");
  });
});
