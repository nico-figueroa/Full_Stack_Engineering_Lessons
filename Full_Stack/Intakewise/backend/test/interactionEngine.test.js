import { expect } from "chai";
import pool from "../src/config/db.js";
import { analyzeInteractions } from "../src/services/interactionEngine.js";
import { normalizeWarnings } from "../src/services/externalDataService.js";

describe("interaction engine", () => {
  let originalQuery;
  beforeEach(() => { originalQuery = pool.query; });
  afterEach(() => { pool.query = originalQuery; });

  it("keeps user notes distinct from source-linked label warnings", async () => {
    pool.query = async () => ({
      rows: [{
        warnings: [{ description: "Review this label section.", source: "DailyMed", sourceUrl: "https://dailymed.nlm.nih.gov/" }],
        fetched_at: new Date(),
      }],
    });
    const results = await analyzeInteractions([{
      id: 1,
      name: "Example",
      warnings: ["Ask a pharmacist about this combination."],
      reference_data: {},
    }]);
    expect(results[0].warnings.map(warning => warning.source)).to.deep.equal(["User-entered note", "DailyMed"]);
    expect(results[0].sources).to.deep.equal(["https://dailymed.nlm.nih.gov/"]);
  });

  it("does not turn generic label wording into a named interaction", async () => {
    pool.query = async () => ({
      rows: [{
        warnings: [{ description: "Avoid using this item with Example Two.", source: "DailyMed", sourceUrl: "https://dailymed.nlm.nih.gov/" }],
        fetched_at: new Date(),
      }],
    });
    const results = await analyzeInteractions([
      { id: 1, name: "Example One", warnings: [], reference_data: {} },
      { id: 2, name: "Example Two", warnings: [], reference_data: {} },
    ]);
    expect(results[0].warnings.some(warning => warning.kind === "source_name_match")).to.equal(true);
    expect(results[1].warnings.some(warning => warning.kind === "source_name_match")).to.equal(true);
  });

  it("normalizes malformed cached warning values to arrays", () => {
    expect(normalizeWarnings({ 0: "legacy" })).to.deep.equal([]);
    expect(normalizeWarnings("{\"legacy\"}")).to.deep.equal([]);
    expect(normalizeWarnings(null)).to.deep.equal([]);
    expect(normalizeWarnings(["Text", "", { description: 5 }, { description: "Valid" }, null]))
      .to.deep.equal(["Text", { description: "Valid" }]);
  });

  it("ignores malformed cached entries and non-array item warnings without crashing", async () => {
    pool.query = async () => ({
      rows: [{
        warnings: [{ description: null }, 42, { description: "Use caution with Example Two.", source: "DailyMed", sourceUrl: "https://dailymed.nlm.nih.gov/" }],
        fetched_at: new Date(),
      }],
    });
    const results = await analyzeInteractions([
      { id: 1, name: "Example One", warnings: { legacy: true }, reference_data: {} },
      { id: 2, name: "Example Two", warnings: null, reference_data: {} },
    ]);
    expect(results[0].warnings.every(warning => typeof warning.description === "string")).to.equal(true);
    expect(results[0].warnings.some(warning => warning.kind === "source_name_match")).to.equal(true);
  });
});
