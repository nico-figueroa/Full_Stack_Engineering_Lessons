import pool from "../config/db.js";

const USER_DECISIONS = new Set(["confirmed", "no_label"]);

export async function persistAutomaticMatchStatus(item, resolution) {
  if (!item?.id || !resolution) return;
  const stored = item.reference_data?.match_status || "";
  if (USER_DECISIONS.has(stored)) return;
  const next = resolution.status === "needs_review" ? "needs_review" : resolution.status === "auto" ? "auto" : null;
  if (!next || next === (stored || "auto")) return;
  try {
    await pool.query(
      `UPDATE items
       SET reference_data = COALESCE(reference_data, '{}'::jsonb) || jsonb_build_object('match_status', $1::text)
       WHERE id = $2 AND COALESCE(reference_data->>'match_status', '') NOT IN ('confirmed', 'no_label')`,
      [next, item.id]
    );
  } catch (error) {
    console.error("Unable to persist label match status", error);
  }
}
