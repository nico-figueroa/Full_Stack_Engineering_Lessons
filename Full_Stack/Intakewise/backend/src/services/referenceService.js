import pool from "../config/db.js";
import { fetchSplXml } from "./dailymedSplService.js";
import { extractProfileSections } from "./dailymedExtractor.js";
import { matchCacheKey, resolveDailyMedLabel } from "./labelMatcher.js";
import { persistAutomaticMatchStatus } from "./matchStatusStore.js";

const CACHE_HOURS = 24;
const OPEN_FDA_URL = "https://api.fda.gov/drug/label.json";

export async function getReferenceForItem(item) {
  const cacheKey = matchCacheKey(item);
  const cached = await getCachedReference(cacheKey);
  if (cached) {
    if (cached.match?.status) await persistAutomaticMatchStatus(item, { status: cached.match.status });
    return { ...cached, userProvided: userProvided(item) };
  }

  const profile = {
    contraindications: [],
    interactions: [],
    foodInteractions: [],
    warnings: [],
    pharmacology: [],
    references: [],
    userProvided: userProvided(item),
    sourceErrors: [],
    match: null,
    reviewRequired: false,
    notice: "Only information returned by the cited sources is shown. Missing sections do not mean there are no risks.",
  };

  let resolution = null;
  try {
    resolution = await resolveDailyMedLabel(item);
  } catch (error) {
    profile.sourceErrors.push(`DailyMed: ${error.message}`);
  }

  const selected = resolution?.selected || null;
  if (resolution) {
    await persistAutomaticMatchStatus(item, resolution);
    profile.match = {
      status: resolution.status,
      setid: selected?.setid || null,
      title: selected?.title || null,
      confidence: selected?.confidence || null,
      reasons: resolution.reasons,
      candidateCount: resolution.candidates.length,
      excludedCount: resolution.excludedCount,
    };
    profile.reviewRequired = resolution.status === "needs_review";
    if (profile.reviewRequired) {
      profile.notice = "The official label could not be matched reliably. Review the label match so the correct product information is shown.";
    }
  }

  if (selected?.setid) {
    profile.references.push({ source: "DailyMed", title: selected.title || `${item.name} drug label`, url: selected.url });
    const [splResult, fdaResult] = await Promise.allSettled([
      fetchSplXml(selected.setid),
      fetchOpenFdaLabel(selected.setid),
    ]);
    if (splResult.status === "fulfilled") mergeSections(profile, extractProfileSections(splResult.value));
    else profile.sourceErrors.push(`DailyMed label: ${splResult.reason.message}`);
    if (fdaResult.status === "rejected") profile.sourceErrors.push(`openFDA: ${fdaResult.reason.message}`);
    const fdaLabel = fdaResult.status === "fulfilled" ? fdaResult.value : null;
    if (fdaLabel) {
      const sections = fdaLabel.openfda || {};
      profile.references.push({
        source: "openFDA",
        title: [...(sections.brand_name || []), ...(sections.generic_name || [])].slice(0, 2).join(" / ") || `${item.name} drug label`,
        url: `${OPEN_FDA_URL}?search=${encodeURIComponent(`openfda.spl_set_id:"${selected.setid}"`)}`,
      });
      addValues(profile.contraindications, fdaLabel.contraindications);
      addValues(profile.interactions, fdaLabel.drug_interactions);
      addValues(profile.foodInteractions, fdaLabel.food_interactions);
      addValues(profile.warnings, fdaLabel.warnings);
      addValues(profile.pharmacology, fdaLabel.clinical_pharmacology);
    }
  }

  profile.references = dedupeReferences(profile.references);
  if (!profile.sourceErrors.length) await cacheReference(cacheKey, item.name, profile);
  return profile;
}

function userProvided(item) {
  return {
    interactionProfile: item.interaction_profile || {},
    warnings: item.warnings || [],
    references: item.reference_data || {},
  };
}

function mergeSections(profile, sections) {
  for (const key of ["contraindications", "interactions", "foodInteractions", "warnings", "pharmacology"]) {
    addValues(profile[key], sections[key]);
  }
  return profile;
}

function addValues(target, values) {
  if (!values) return;
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text && !target.includes(text)) target.push(text);
  }
}

function dedupeReferences(references) {
  return references.filter((reference, index, all) => all.findIndex(other => other.url === reference.url) === index);
}

async function fetchOpenFdaLabel(setid) {
  const query = `openfda.spl_set_id:"${setid}"`;
  const url = `${OPEN_FDA_URL}?search=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`openFDA label request failed with HTTP ${response.status}`);
  const result = await response.json();
  return result.results?.[0] || null;
}

async function getCachedReference(normalizedName) {
  const result = await pool.query(
    `SELECT payload, fetched_at FROM reference_cache
     WHERE normalized_name = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [normalizedName]
  );
  if (!result.rows[0]) return null;
  const payload = result.rows[0].payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const age = Date.now() - new Date(result.rows[0].fetched_at).getTime();
  return age <= CACHE_HOURS * 60 * 60 * 1000 ? payload : null;
}

async function cacheReference(normalizedName, itemName, profile) {
  await pool.query(
    `INSERT INTO reference_cache (item_name, normalized_name, source, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [itemName, normalizedName, "official_label_apis", JSON.stringify(profile)]
  );
}
