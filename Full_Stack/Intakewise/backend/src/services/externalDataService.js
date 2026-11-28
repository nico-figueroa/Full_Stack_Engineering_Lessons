import pool from "../config/db.js";
import { dailyMedWebUrl } from "../config/externalServices.js";
import { fetchSplXml } from "./dailymedSplService.js";
import { extractInteractionsFromSplXml } from "./dailymedExtractor.js";
import { matchCacheKey, resolveDailyMedLabel } from "./labelMatcher.js";
import { persistAutomaticMatchStatus } from "./matchStatusStore.js";
import { getBroaderEvidence } from "./broaderEvidenceService.js";

const CACHE_HOURS = 24;

export async function getExternalInteractionsForItem(item) {
  if (!String(item.name || "").trim()) return [];
  const cacheKey = matchCacheKey(item);
  const cached = await pool.query(
    `SELECT warnings, fetched_at FROM interaction_cache
     WHERE normalized_name = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [cacheKey]
  );
  const cachedRow = cached.rows[0];
  if (cachedRow && Array.isArray(cachedRow.warnings)
    && Date.now() - new Date(cachedRow.fetched_at).getTime() <= CACHE_HOURS * 60 * 60 * 1000) {
    return normalizeWarnings(cachedRow.warnings);
  }

  let warnings = [];
  let cacheable = true;
  try {
    let resolution = await resolveDailyMedLabel(item);
    if (!resolution.selected && resolution.status === "needs_review") {
      const evidence = await getBroaderEvidence(item);
      if (evidence.normalization?.name && evidence.normalization.name !== item.name) {
        const normalizedResolution = await resolveDailyMedLabel(item, { query: evidence.normalization.name });
        if (normalizedResolution.selected) resolution = normalizedResolution;
      }
    }
    await persistAutomaticMatchStatus(item, resolution);
    const splId = resolution.selected?.setid;
    if (splId) {
      warnings = normalizeWarnings(extractInteractionsFromSplXml(await fetchSplXml(splId)));
    } else if (resolution.status === "needs_review") {
      warnings = [{
        description: `The official label for ${item.name} could not be matched reliably. Review the label match to load official interaction information.`,
        severity: "review",
        source: "DailyMed",
        sourceUrl: `${dailyMedWebUrl()}/`,
      }];
    }
  } catch (error) {
    cacheable = false;
    warnings = [{
      description: `Official interaction information could not be retrieved: ${error.message}`,
      severity: "unavailable",
      source: "DailyMed",
      sourceUrl: `${dailyMedWebUrl()}/`,
    }];
  }

  if (cacheable) {
    await pool.query(
      `INSERT INTO interaction_cache (item_name, normalized_name, source, warnings)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [item.name, cacheKey, "DailyMed", JSON.stringify(warnings)]
    );
  }
  return warnings;
}

export function normalizeWarnings(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(warning => {
      if (typeof warning === "string") return warning.trim() ? warning : null;
      if (warning && typeof warning === "object" && typeof warning.description === "string" && warning.description.trim()) return warning;
      return null;
    })
    .filter(Boolean);
}
