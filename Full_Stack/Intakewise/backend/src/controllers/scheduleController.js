import pool from "../config/db.js";
import { buildSchedule } from "../services/scheduleEngine.js";
import { analyzeInteractions } from "../services/interactionEngine.js";
import { z } from "zod";

export async function generateSchedule(req, res) {
  const { from, to } = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).superRefine(({ from, to }, context) => {
    const start = Date.parse(`${from}T00:00:00.000Z`);
    const end = Date.parse(`${to}T00:00:00.000Z`);
    if (Number.isNaN(start) || new Date(start).toISOString().slice(0, 10) !== from) {
      context.addIssue({ code: "custom", message: "from must be a real calendar date", path: ["from"] });
    }
    if (Number.isNaN(end) || new Date(end).toISOString().slice(0, 10) !== to) {
      context.addIssue({ code: "custom", message: "to must be a real calendar date", path: ["to"] });
    }
    if (!Number.isNaN(start) && !Number.isNaN(end) && (end < start || end - start > 365 * 86400000)) {
      context.addIssue({ code: "custom", message: "Schedule range must be ordered and no longer than 366 days", path: ["to"] });
    }
  }).parse(req.query);

  const items = await pool.query(
    `SELECT * FROM items WHERE user_id = $1`,
    [req.user.id]
  );

  const overrides = await pool.query(
    `SELECT * FROM schedule_overrides WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
    [req.user.id, from, to]
  );

  const interactions = await analyzeInteractions(items.rows);
  const warningsByItem = new Map(interactions.map(result => [
    String(result.item_id),
    result.warnings.map(warning => warning.description),
  ]));
  const scheduledItems = items.rows.map(item => ({
    ...item,
    warnings: [...(item.warnings || []), ...(warningsByItem.get(String(item.id)) || [])],
  }));
  const schedule = buildSchedule(scheduledItems, overrides.rows, from, to);

  res.json({ schedule });
}
