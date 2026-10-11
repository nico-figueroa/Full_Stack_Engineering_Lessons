import { z } from "zod";
import pool from "../config/db.js";

const overrideSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().trim().min(1).max(20),
  dosage: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  is_skipped: z.boolean().default(false),
});

async function assertOwnedItem(itemId, userId) {
  const result = await pool.query(
    "SELECT id FROM items WHERE id = $1 AND user_id = $2",
    [itemId, userId]
  );
  return result.rowCount > 0;
}

export async function listOverrides(req, res) {
  const result = await pool.query(
    `SELECT o.* FROM schedule_overrides o
     JOIN items i ON i.id = o.item_id AND i.user_id = o.user_id
     WHERE o.user_id = $1 ORDER BY o.date, o.time`,
    [req.user.id]
  );
  res.json({ overrides: result.rows });
}

export async function createOverride(req, res) {
  const value = overrideSchema.parse(req.body);
  if (!(await assertOwnedItem(value.item_id, req.user.id))) {
    return res.status(404).json({ error: "Item not found" });
  }
  const result = await pool.query(
    `INSERT INTO schedule_overrides (item_id, user_id, date, time, dosage, notes, is_skipped)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (item_id, date, time) DO UPDATE SET dosage = EXCLUDED.dosage,
       notes = EXCLUDED.notes, is_skipped = EXCLUDED.is_skipped
     WHERE schedule_overrides.user_id = EXCLUDED.user_id
     RETURNING *`,
    [value.item_id, req.user.id, value.date, value.time, value.dosage ?? null, value.notes ?? null, value.is_skipped]
  );
  if (!result.rows[0]) return res.status(409).json({ error: "This schedule slot cannot be overridden." });
  res.status(201).json({ override: result.rows[0] });
}

export async function updateOverride(req, res) {
  const value = overrideSchema.parse(req.body);
  if (!(await assertOwnedItem(value.item_id, req.user.id))) {
    return res.status(404).json({ error: "Item not found" });
  }
  const result = await pool.query(
    `UPDATE schedule_overrides SET item_id = $1, date = $2, time = $3, dosage = $4,
       notes = $5, is_skipped = $6
     WHERE id = $7 AND user_id = $8 RETURNING *`,
    [value.item_id, value.date, value.time, value.dosage ?? null, value.notes ?? null,
      value.is_skipped, req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Override not found" });
  res.json({ override: result.rows[0] });
}

export async function deleteOverride(req, res) {
  const result = await pool.query(
    "DELETE FROM schedule_overrides WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "Override not found" });
  res.status(204).end();
}
