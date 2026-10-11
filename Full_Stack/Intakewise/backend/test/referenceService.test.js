import { expect } from "chai";
import pool from "../src/config/db.js";
import { getReferenceForItem } from "../src/services/referenceService.js";

describe("reference profile service", () => {
  let originalQuery;
  beforeEach(() => { originalQuery = pool.query; });
  afterEach(() => { pool.query = originalQuery; });

  it("uses a fresh cache entry and retains user-provided profile fields", async () => {
    pool.query = async () => ({
      rows: [{
        payload: { warnings: ["Label warning"], references: [], userProvided: {} },
        fetched_at: new Date(),
      }],
    });
    const profile = await getReferenceForItem({
      name: "Example",
      interaction_profile: { notes: "Saved review note" },
      warnings: ["Saved warning"],
      reference_data: { source_url: "https://example.test" },
    });
    expect(profile.warnings).to.deep.equal(["Label warning"]);
    expect(profile.userProvided.warnings).to.deep.equal(["Saved warning"]);
    expect(profile.userProvided.interactionProfile.notes).to.equal("Saved review note");
  });
});
