import { jest } from "@jest/globals";
import pool from "../db.js";

describe("database schema initialization", () => {
  test("initializes every new client before checking its active schema", async () => {
    for (let i = 0; i < 2; i++) {
      let finishSetup;
      const setup = new Promise((resolve) => {
        finishSetup = resolve;
      });
      const client = {
        query: jest
          .fn()
          .mockReturnValueOnce(setup)
          .mockResolvedValueOnce({ rows: [{ schema: "nomadant_tech" }] }),
      };

      const initialized = pool.options.onConnect(client);
      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenNthCalledWith(
        1,
        "SET search_path TO nomadant_tech, public",
      );
      finishSetup();
      await initialized;
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        "SELECT current_schema() AS schema",
      );
    }
  });

  test("propagates setup errors", async () => {
    const error = new Error("connection lost");
    const client = { query: jest.fn().mockRejectedValue(error) };
    await expect(pool.options.onConnect(client)).rejects.toBe(error);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  test.each(["public", null])("rejects fallback to schema %s", async (schema) => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ schema }] }),
    };
    await expect(pool.options.onConnect(client)).rejects.toThrow(
      "Database schema nomadant_tech is missing or inaccessible",
    );
  });
});
