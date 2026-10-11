import { z } from "zod";
import pool from "../config/db.js";
import { getReferenceForItem } from "../services/referenceService.js";
import { publicCandidate, resolveDailyMedLabel } from "../services/labelMatcher.js";

const MATCH_FIELDS = ["match_status", "dailymed_setid", "match_title"];

const matchSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("confirmed"),
    setid: z.string().trim().regex(/^[a-f0-9-]{8,64}$/i),
    title: z.string().trim().max(500).optional().default(""),
  }),
  z.object({ status: z.literal("no_label") }),
  z.object({ status: z.literal("auto") }),
]);

async function findItem(itemId, userId) {
  const result = await pool.query(`SELECT * FROM items WHERE id = $1 AND user_id = $2`, [itemId, userId]);
  return result.rows[0] || null;
}

export async function getReference(req, res) {
  const item = await findItem(req.params.itemId, req.user.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const reference = await getReferenceForItem(item);
  const data = item.reference_data || {};
  const status = reference.match?.status;
  const isUserDecision = data.match_status === "confirmed" || data.match_status === "no_label";
  if (status && !isUserDecision && !reference.sourceErrors?.length
    && (data.match_status !== status || (data.match_title || null) !== (reference.match.title || null))) {
    await pool.query(
      `UPDATE items
       SET reference_data = COALESCE(reference_data, '{}'::jsonb) || jsonb_build_object('match_status', $1::text, 'match_title', $2::text)
       WHERE id = $3 AND user_id = $4`,
      [status, reference.match.title || null, item.id, req.user.id]
    );
  }

  res.json({ reference });
}

export async function getCandidates(req, res) {
  const item = await findItem(req.params.itemId, req.user.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const query = z.string().trim().max(160).optional().parse(req.query.q) || item.name;
  try {
    const resolution = await resolveDailyMedLabel(item, { query });
    const data = item.reference_data || {};
    res.json({
      query,
      candidates: resolution.candidates.slice(0, 25).map(publicCandidate),
      excludedCount: resolution.excludedCount,
      current: {
        status: data.match_status || null,
        setid: data.dailymed_setid || null,
        title: data.match_title || null,
      },
    });
  } catch (error) {
    res.status(502).json({ error: `DailyMed search failed: ${error.message}` });
  }
}

export async function setMatch(req, res) {
  const body = matchSchema.parse(req.body);
  const item = await findItem(req.params.itemId, req.user.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const data = { ...(item.reference_data || {}) };
  for (const field of MATCH_FIELDS) delete data[field];
  if (body.status === "confirmed") {
    data.match_status = "confirmed";
    data.dailymed_setid = body.setid.toLowerCase();
    data.match_title = body.title || null;
  } else if (body.status === "no_label") {
    data.match_status = "no_label";
  }

  const result = await pool.query(
    `UPDATE items SET reference_data = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [data, item.id, req.user.id]
  );
  const updated = result.rows[0];
  res.json({
    item: {
      ...updated,
      times_of_day: updated.times_of_day || [],
      interaction_profile: updated.interaction_profile || {},
      reference_data: updated.reference_data || {},
      warnings: updated.warnings || [],
    },
  });
}
