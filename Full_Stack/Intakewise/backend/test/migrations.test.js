import { expect } from "chai";
import { runMigrations } from "../src/server.js";

const baselineColumns = {
  users: ["id", "email", "password_hash", "timezone", "created_at", "updated_at"],
  items: ["id", "user_id", "name", "category", "dosage_per_intake", "frequency", "times_of_day", "container_quantity", "created_at", "updated_at"],
  schedule_overrides: ["id", "item_id", "user_id", "date", "time", "dosage", "notes"],
  reference_cache: ["id", "item_name", "normalized_name", "source", "payload", "fetched_at"],
  interaction_cache: ["id", "item_name", "normalized_name", "source", "warnings", "fetched_at"],
};

function createDatabasePool(schemaColumns) {
  const appliedMigrations = new Set();
  const migrationSql = [];
  const client = {
    async query(query, values = []) {
      if (query.includes("SELECT name FROM schema_migrations LIMIT 1")) {
        const rows = [...appliedMigrations].slice(0, 1).map(name => ({ name }));
        return { rows, rowCount: rows.length };
      }
      if (query.includes("FROM information_schema.columns")) {
        return {
          rows: Object.entries(schemaColumns).flatMap(([table_name, columns]) =>
            columns.map(column_name => ({ table_name, column_name }))),
          rowCount: Object.values(schemaColumns).flat().length,
        };
      }
      if (query.includes("SELECT unnest($1::text[])")) {
        values[0].forEach(name => appliedMigrations.add(name));
        return { rows: [], rowCount: values[0].length };
      }
      if (query.includes("SELECT 1 FROM schema_migrations WHERE name = $1")) {
        const rows = appliedMigrations.has(values[0]) ? [{ "?column?": 1 }] : [];
        return { rows, rowCount: rows.length };
      }
      if (query.includes("INSERT INTO schema_migrations (name) VALUES ($1)")) {
        appliedMigrations.add(values[0]);
        return { rows: [], rowCount: 1 };
      }
      if (query.includes("ALTER TABLE users ADD COLUMN IF NOT EXISTS name")) migrationSql.push("005");
      if (query.includes("CREATE TABLE auth_sessions")) migrationSql.push("006");
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  return {
    migrationSql,
    appliedMigrations,
    pool: { async connect() { return client; } },
  };
}

describe("database migration startup", () => {
  it("adopts a complete existing schema without replaying baseline CREATE TABLE migrations", async () => {
    const { pool, appliedMigrations, migrationSql } = createDatabasePool(baselineColumns);

    await runMigrations({ databasePool: pool });

    expect([...appliedMigrations]).to.include.members([
      "001_create_users.sql",
      "002_create_items.sql",
      "003_create_schedule_overrides.sql",
      "004_create_reference_cache.sql",
      "005_complete_profiles_and_overrides.sql",
      "006_create_auth_sessions.sql",
    ]);
    expect(migrationSql).to.deep.equal(["005", "006"]);
  });

  it("does not adopt or run migrations against an incomplete existing schema", async () => {
    const incompleteSchema = { ...baselineColumns, items: ["id", "name"] };
    const { pool, appliedMigrations } = createDatabasePool(incompleteSchema);

    const error = await runMigrations({ databasePool: pool }).then(
      () => null,
      caught => caught,
    );

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.include("does not match the expected pre-migration baseline");
    expect(appliedMigrations).to.be.empty;
  });
});
