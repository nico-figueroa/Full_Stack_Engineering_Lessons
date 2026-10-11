import { expect } from "chai";
import pool from "../src/config/db.js";
import { createOverride, deleteOverride } from "../src/controllers/overridesController.js";

describe("schedule override controller", () => {
  let originalQuery;
  beforeEach(() => { originalQuery = pool.query; });
  afterEach(() => { pool.query = originalQuery; });

  it("only creates an override for an item owned by the authenticated account", async () => {
    const calls = [];
    pool.query = async (query, values) => {
      calls.push({ query, values });
      if (query.startsWith("SELECT id FROM items")) return { rowCount: 1 };
      return { rows: [{ id: 5, item_id: 12, user_id: 44, date: "2026-10-09", time: "09:00" }] };
    };
    const response = createResponse();
    await createOverride({ user: { id: 44 }, body: { item_id: 12, date: "2026-10-09", time: "09:00" } }, response);
    expect(calls[0].values).to.deep.equal([12, 44]);
    expect(calls[1].query).to.include("ON CONFLICT");
    expect(calls[1].values[1]).to.equal(44);
    expect(response.statusCode).to.equal(201);
  });

  it("does not disclose or remove another user's override", async () => {
    pool.query = async () => ({ rowCount: 0 });
    const response = createResponse();
    await deleteOverride({ user: { id: 44 }, params: { id: "99" } }, response);
    expect(response.statusCode).to.equal(404);
  });
});

function createResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { this.ended = true; },
  };
}
