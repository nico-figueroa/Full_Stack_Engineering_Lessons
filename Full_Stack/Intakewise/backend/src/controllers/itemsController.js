import pool from "../config/db.js";
import { z } from "zod";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(["medication", "supplement", "vitamin", "custom", "alcohol", "nicotine", "cannabis", "other"]),
  dosage_per_intake: z.string().trim().max(160).nullable().optional(),
  frequency: z.string().trim().min(1).max(80).default("daily"),
  times_of_day: z.array(z.string().trim().min(1).max(20)).max(12).default(["morning"]),
  container_quantity: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  interaction_profile: z.record(z.string(), z.unknown()).default({}),
  reference_data: z.record(z.string(), z.unknown()).default({}),
  warnings: z.array(z.string().trim().min(1).max(1000)).max(50).default([]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const itemColumns = `name, category, dosage_per_intake, frequency, times_of_day,
  container_quantity, interaction_profile, reference_data, warnings, notes`;
function serializeItem(item) {
  return {
    ...item,
    times_of_day: item.times_of_day || [],
    interaction_profile: item.interaction_profile || {},
    reference_data: item.reference_data || {},
    warnings: item.warnings || [],
  };
}

export async function getItems(req, res) {
  const result = await pool.query(
    `SELECT * FROM items WHERE user_id = $1 ORDER BY id`,
    [req.user.id]
  );
  res.json(result.rows.map(serializeItem));
}

export async function getItem(req, res) {
  const result = await pool.query(
    `SELECT * FROM items WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Item not found" });
  res.json(serializeItem(result.rows[0]));
}

export async function createItem(req, res) {
  const item = itemSchema.parse(req.body);

  const result = await pool.query(
    `INSERT INTO items
     (user_id, ${itemColumns})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      req.user.id,
      item.name, item.category, item.dosage_per_intake || null, item.frequency,
      item.times_of_day, item.container_quantity ?? null, item.interaction_profile,
      item.reference_data, JSON.stringify(item.warnings), item.notes || null
    ]
  );

  res.status(201).json(serializeItem(result.rows[0]));
}

export async function updateItem(req, res) {
  const item = itemSchema.parse(req.body);

  const result = await pool.query(
    `UPDATE items SET
      name = $1, category = $2, dosage_per_intake = $3, frequency = $4,
      times_of_day = $5, container_quantity = $6, interaction_profile = $7,
      reference_data = $8, warnings = $9, notes = $10,
      updated_at = NOW()
     WHERE id = $11 AND user_id = $12
     RETURNING *`,
    [
      item.name, item.category, item.dosage_per_intake || null, item.frequency,
      item.times_of_day, item.container_quantity ?? null, item.interaction_profile,
      item.reference_data, JSON.stringify(item.warnings), item.notes || null,
      req.params.id,
      req.user.id
    ]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "Item not found" });
  res.json(serializeItem(result.rows[0]));
}

export async function deleteItem(req, res) {
  const result = await pool.query(
    `DELETE FROM items WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Item not found" });
  res.status(204).end();
}
