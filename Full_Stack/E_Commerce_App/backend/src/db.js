import pkg from "pg";
import { logQuery, logQueryError } from "./utils/dbLogger.js";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  allowExitOnIdle: process.env.NODE_ENV === "test",
  onConnect: async (client) => {
    await client.query("SET search_path TO nomadant_tech, public");
    const { rows } = await client.query("SELECT current_schema() AS schema");
    if (rows[0].schema !== "nomadant_tech") {
      throw new Error("Database schema nomadant_tech is missing or inaccessible");
    }
  },
});

// Wrap pool.query to add logging
const originalQuery = pool.query.bind(pool);

pool.query = async (sql, params = []) => {
  const start = performance.now();

  try {
    const result = await originalQuery(sql, params);
    const duration = performance.now() - start;

    logQuery(sql, params, duration);

    return result;
  } catch (err) {
    const duration = performance.now() - start;
    logQueryError(sql, params, duration, err);

    throw err;
  }
};

export default pool;
