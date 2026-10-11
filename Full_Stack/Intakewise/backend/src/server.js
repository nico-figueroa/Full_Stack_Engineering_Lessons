import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import swaggerUi from "swagger-ui-express";
import pool from "./config/db.js";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import scheduleRoutes from "./routes/schedule.js";
import interactionRoutes from "./routes/interactions.js";
import referenceRoutes from "./routes/reference.js";
import stockRoutes from "./routes/stock.js";
import overrideRoutes from "./routes/overrides.js";
import adminRoutes from "./routes/admin.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const openApiSpec = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "openapi.json"), "utf8"));
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean)
  .map(origin => new URL(origin.includes("://") ? origin : `https://${origin}`).origin);

const standardSecurityHeaders = helmet();
const documentationSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});
app.use((req, res, next) => (req.path === "/" ? documentationSecurityHeaders : standardSecurityHeaders)(req, res, next));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(new URL(origin).origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.get("/", swaggerUi.setup(undefined, { swaggerOptions: { url: "/openapi.json" } }));
app.use("/", swaggerUi.serve);
app.get("/openapi.json", (req, res) => res.json(openApiSpec));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

export const apiRouters = [
  ["/api/auth", authRoutes],
  ["/api/items", itemRoutes],
  ["/api/schedule", scheduleRoutes],
  ["/api/interactions", interactionRoutes],
  ["/api/reference", referenceRoutes],
  ["/api/stock", stockRoutes],
  ["/api/overrides", overrideRoutes],
  ["/api/admin", adminRoutes],
];
for (const [prefix, router] of apiRouters) app.use(prefix, router);
app.use(errorHandler);

const legacyBaselineMigrations = [
  "001_create_users.sql",
  "002_create_items.sql",
  "003_create_schedule_overrides.sql",
  "004_create_reference_cache.sql",
];

const legacyBaselineColumns = {
  users: ["id", "email", "password_hash", "timezone", "created_at", "updated_at"],
  items: ["id", "user_id", "name", "category", "dosage_per_intake", "frequency", "times_of_day", "container_quantity", "created_at", "updated_at"],
  schedule_overrides: ["id", "item_id", "user_id", "date", "time", "dosage", "notes"],
  reference_cache: ["id", "item_name", "normalized_name", "source", "payload", "fetched_at"],
  interaction_cache: ["id", "item_name", "normalized_name", "source", "warnings", "fetched_at"],
};

async function adoptLegacyMigrationHistory(client) {
  const history = await client.query("SELECT name FROM schema_migrations LIMIT 1");
  if (history.rowCount) return false;

  const { rows } = await client.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])`,
    [Object.keys(legacyBaselineColumns)],
  );
  if (rows.length === 0) return false;

  const existingColumns = new Map();
  for (const { table_name: tableName, column_name: columnName } of rows) {
    if (!existingColumns.has(tableName)) existingColumns.set(tableName, new Set());
    existingColumns.get(tableName).add(columnName);
  }

  const missing = Object.entries(legacyBaselineColumns).flatMap(([tableName, columns]) => {
    const available = existingColumns.get(tableName);
    return columns.filter(column => !available?.has(column)).map(column => `${tableName}.${column}`);
  });
  if (missing.length) {
    throw new Error(
      `Existing database objects were found, but their schema does not match the expected pre-migration baseline. ` +
      `Missing required columns: ${missing.join(", ")}. No application tables or data were changed. ` +
      "Back up the database and reconcile its schema_migrations history before restarting.",
    );
  }

  await client.query(
    `INSERT INTO schema_migrations (name)
     SELECT unnest($1::text[])
     ON CONFLICT (name) DO NOTHING`,
    [legacyBaselineMigrations],
  );
  return true;
}

export async function runMigrations({
  databasePool = pool,
  migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations"),
} = {}) {
  const directory = migrationsDirectory;
  const files = (await readdir(directory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  const client = await databasePool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    if (await adoptLegacyMigrationHistory(client)) {
      console.info("Adopted the validated existing schema as migrations 001–004; applying pending migrations.");
    }
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (applied.rowCount) continue;
      await client.query("BEGIN");
      try {
        await client.query(await readFile(join(directory, file), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Failed to apply migration ${file}`, { cause: error });
      }
    }
  } finally {
    client.release();
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  const port = Number(process.env.PORT || 5000);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  runMigrations()
    .then(() => app.listen(port, () => console.log(`Drug Intake Organizer API listening on ${port}`)))
    .catch(error => {
      console.error("Application startup failed", error);
      process.exitCode = 1;
    });
}

export default app;
