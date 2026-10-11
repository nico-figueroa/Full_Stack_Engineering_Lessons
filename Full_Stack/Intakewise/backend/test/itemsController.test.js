import { expect } from "chai";
import pool from "../src/config/db.js";
import { createItem, deleteItem, updateItem } from "../src/controllers/itemsController.js";

describe("item CRUD controller", () => {
  let originalQuery;
  let calls;

  beforeEach(() => {
    originalQuery = pool.query;
    calls = [];
  });
  afterEach(() => { pool.query = originalQuery; });

  it("creates a validated item scoped to the authenticated user", async () => {
    pool.query = async (query, values) => {
      calls.push({ query, values });
      return { rows: [{ id: 12, user_id: 44, name: "Vitamin", times_of_day: ["morning"], warnings: [] }] };
    };
    const response = createResponse();
    await createItem({ user: { id: 44 }, body: { name: " Vitamin ", category: "vitamin" } }, response);
    expect(response.statusCode).to.equal(201);
    expect(response.payload.name).to.equal("Vitamin");
    expect(calls[0].values[0]).to.equal(44);
    expect(calls[0].query).to.include("VALUES ($1, $2");
  });

  it("updates only the current user's item", async () => {
    pool.query = async (query, values) => {
      calls.push({ query, values });
      return { rows: [{ id: 12, name: "Updated", times_of_day: [], warnings: [] }] };
    };
    const response = createResponse();
    await updateItem({ user: { id: 44 }, params: { id: "12" }, body: { name: "Updated", category: "custom" } }, response);
    expect(calls[0].values.slice(-2)).to.deep.equal(["12", 44]);
    expect(response.payload.name).to.equal("Updated");
  });

  it("returns 404 if the user cannot delete the requested item", async () => {
    pool.query = async () => ({ rowCount: 0 });
    const response = createResponse();
    await deleteItem({ user: { id: 44 }, params: { id: "12" } }, response);
    expect(response.statusCode).to.equal(404);
    expect(response.payload.error).to.equal("Item not found");
  });

  it("rejects invalid item input before issuing a database query", async () => {
    pool.query = async () => { throw new Error("should not reach database"); };
    const response = createResponse();
    try {
      await createItem({ user: { id: 44 }, body: { name: "", category: "unknown" } }, response);
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error.name).to.equal("ZodError");
    }
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
