import { readFileSync } from "node:fs";
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export function resolveSslCa(env = process.env, readFile = readFileSync) {
  if (env.DATABASE_SSL_CA_FILE) {
    try {
      return readFile(env.DATABASE_SSL_CA_FILE, "utf8");
    } catch (error) {
      throw new Error(`Unable to read DATABASE_SSL_CA_FILE at ${env.DATABASE_SSL_CA_FILE}`, { cause: error });
    }
  }
  // Dashboards often store multi-line values with literal "\n" sequences.
  return env.DATABASE_SSL_CA ? env.DATABASE_SSL_CA.replace(/\\n/g, "\n") : undefined;
}

const ca = process.env.DATABASE_SSL === "true" ? resolveSslCa() : undefined;

const ssl = process.env.DATABASE_SSL === "true"
  ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
  : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", error => console.error("Unexpected PostgreSQL pool error", error));

export default pool;
