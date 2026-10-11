import { fetchSplList, fetchSplListByNdc } from "./dailymedSplService.js";

export const MATCH_STATUSES = ["auto", "confirmed", "needs_review", "no_label"];
const CACHE_VERSION = "v2";
const AMBIGUITY_WINDOW = 10;
const MIN_AUTO_SCORE = 35;
const COSMETIC_CHECK_CATEGORIES = new Set(["medication", "supplement", "vitamin"]);
const COSMETIC_TERMS = [
  "antiperspirant", "deodorant", "sunscreen", "spf", "lip balm", "lipstick", "chapstick", "milia remover",
  "hand sanitizer", "sanitizing", "toothpaste", "mouthwash", "shampoo", "conditioner", "body wash",
  "makeup", "foundation", "concealer", "moisturizer", "cleanser", "acne", "dandruff", "wart remover",
];
const FORM_WORDS = new Set([
  "tablet", "tablets", "capsule", "capsules", "kit", "liquid", "solution", "suspension", "injection",
  "injectable", "cream", "ointment", "gel", "lotion", "powder", "spray", "patch", "film", "coated",
  "extended", "release", "delayed", "chewable", "orally", "disintegrating", "oral", "topical", "syrup",
  "elixir", "drops", "lozenge", "granule", "granules", "stick", "aerosol", "suppository", "for",
]);

export function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9%.]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(haystack, needle) {
  if (!needle) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(needle)}([^a-z0-9]|$)`).test(haystack);
}

function stripTrailingForms(words) {
  const result = [...words];
  const form = [];
  while (result.length > 1 && FORM_WORDS.has(result[result.length - 1])) form.unshift(result.pop());
  return { words: result, form };
}

export function parseLabelTitle(title) {
  const raw = String(title || "").trim();
  const labelerMatch = raw.match(/\[([^\]]*)\]\s*$/);
  const labeler = labelerMatch ? labelerMatch[1].trim() : "";
  const body = labelerMatch ? raw.slice(0, labelerMatch.index).trim() : raw;
  const open = body.indexOf("(");
  const close = body.lastIndexOf(")");
  let brand;
  let generic;
  let form;
  if (open >= 0 && close > open) {
    brand = body.slice(0, open).trim();
    generic = body.slice(open + 1, close).trim();
    form = body.slice(close + 1).trim();
  } else {
    const split = stripTrailingForms(body.split(/\s+/));
    brand = split.words.join(" ");
    generic = brand;
    form = split.form.join(" ");
  }
  return {
    brand: brand.toLowerCase(),
    generic: generic.toLowerCase(),
    form: form.toLowerCase(),
    labeler: labeler.toLowerCase(),
  };
}

export function itemIdentifiers(item = {}) {
  const data = item.reference_data && typeof item.reference_data === "object" ? item.reference_data : {};
  const ingredients = Array.isArray(data.active_ingredients)
    ? data.active_ingredients
    : String(data.active_ingredients || "").split(/[,;+/]|\band\b/i);
  return {
    name: normalizeText(item.name),
    category: item.category || "",
    activeIngredients: ingredients.map(normalizeText).filter(Boolean),
    manufacturer: normalizeText(data.manufacturer),
    ndc: String(data.ndc || "").trim(),
    dosageForm: normalizeText(data.dosage_form),
    strength: normalizeText(data.strength),
    setid: String(data.dailymed_setid || "").trim().toLowerCase(),
    status: MATCH_STATUSES.includes(data.match_status) ? data.match_status : "",
  };
}

export function scoreCandidate(candidate, ids) {
  const title = candidate.title || "";
  const parsed = parseLabelTitle(title);
  const lowerTitle = title.toLowerCase();
  const reasons = [];
  const setid = String(candidate.setid || candidate.spl_id || "").toLowerCase();
  const base = { setid, title, ...parsed, url: setid ? labelUrl(setid) : null };

  if (ids.setid && setid === ids.setid) {
    return { ...base, score: 1000, confidence: "confirmed", rejected: false, reasons: ["Matches the confirmed DailyMed Set ID"] };
  }

  if (COSMETIC_CHECK_CATEGORIES.has(ids.category)) {
    const term = COSMETIC_TERMS.find(word => containsWord(lowerTitle, word));
    if (term) return { ...base, score: 0, confidence: "none", rejected: true, reasons: [`Cosmetic/personal-care product ("${term}") does not fit a ${ids.category}`] };
  }

  const brand = normalizeText(parsed.brand);
  const generic = normalizeText(parsed.generic);
  let nameScore = 0;
  if (ids.name) {
    if (brand === ids.name) { nameScore = 60; reasons.push("Brand name matches exactly"); }
    else if (generic === ids.name) { nameScore = 50; reasons.push("Generic name matches exactly"); }
    else if (brand.startsWith(`${ids.name} `)) { nameScore = 40; reasons.push("Brand name starts with the item name"); }
    else if (containsWord(generic, ids.name)) { nameScore = 35; reasons.push("Item name is an ingredient in the generic name"); }
    else if (containsWord(brand, ids.name)) { nameScore = 25; reasons.push("Item name appears as a whole word in the brand name"); }
  }
  let score = nameScore;
  if (candidate.ndcMatch) { score += 100; reasons.push("Matches the NDC you entered"); }
  if (!nameScore && !candidate.ndcMatch) {
    return { ...base, score: 0, confidence: "none", rejected: true, reasons: ["Name only partially matches another word in the label title"] };
  }

  if (ids.activeIngredients.length) {
    const found = ids.activeIngredients.filter(ingredient => containsWord(generic, ingredient) || containsWord(brand, ingredient));
    if (found.length === ids.activeIngredients.length) { score += 30; reasons.push("All entered active ingredients match"); }
    else if (found.length) { score += 10; reasons.push(`Some active ingredients match (${found.join(", ")})`); }
    else { score -= 40; reasons.push("None of the entered active ingredients appear on this label"); }
  }
  if (ids.manufacturer && containsWord(parsed.labeler, ids.manufacturer.split(" ")[0])) {
    score += 15; reasons.push("Manufacturer/labeler matches");
  }
  if (ids.dosageForm && containsWord(normalizeText(`${parsed.form} ${title}`), ids.dosageForm)) {
    score += 10; reasons.push("Dosage form matches");
  }
  if (ids.strength && normalizeText(title).includes(ids.strength)) {
    score += 5; reasons.push("Strength matches");
  }

  return { ...base, score, confidence: confidenceFor(score), rejected: score <= 0, reasons };
}

function confidenceFor(score) {
  if (score >= 60) return "high";
  if (score >= MIN_AUTO_SCORE) return "medium";
  return "low";
}

export function rankCandidates(list, ids) {
  const seen = new Set();
  const scored = [];
  for (const candidate of list || []) {
    const key = String(candidate.setid || candidate.spl_id || candidate.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    scored.push(scoreCandidate(candidate, ids));
  }
  const accepted = scored.filter(candidate => !candidate.rejected).sort((a, b) => b.score - a.score);
  return { accepted, excludedCount: scored.length - accepted.length };
}

export function selectLabel(list, ids) {
  const { accepted, excludedCount } = rankCandidates(list, ids);
  if (!accepted.length) {
    return {
      status: "needs_review",
      selected: null,
      candidates: [],
      excludedCount,
      reasons: [excludedCount
        ? `${excludedCount} DailyMed result(s) were excluded because they did not reliably match this item`
        : "No DailyMed label was found for this name"],
    };
  }
  const top = accepted[0];
  if (top.score >= 1000) return { status: "confirmed", selected: top, candidates: accepted, excludedCount, reasons: top.reasons };
  if (top.score < MIN_AUTO_SCORE) {
    return { status: "needs_review", selected: null, candidates: accepted, excludedCount, reasons: ["Only weak label matches were found"] };
  }
  const contenders = accepted.filter(candidate => top.score - candidate.score <= AMBIGUITY_WINDOW);
  const distinctGenerics = new Set(contenders.map(candidate => normalizeText(candidate.generic)));
  if (distinctGenerics.size > 1) {
    return {
      status: "needs_review",
      selected: null,
      candidates: accepted,
      excludedCount,
      reasons: ["Several labels with different active ingredients match this name equally well"],
    };
  }
  return { status: "auto", selected: top, candidates: accepted, excludedCount, reasons: top.reasons };
}

export async function resolveDailyMedLabel(item, { query } = {}) {
  const ids = itemIdentifiers(item);
  if (query !== undefined) ids.name = normalizeText(query);
  if (query === undefined && ids.status === "no_label") {
    return { status: "no_label", selected: null, candidates: [], excludedCount: 0, reasons: ["Marked by you as having no official label"] };
  }
  if (query === undefined && ids.status === "confirmed" && ids.setid) {
    return {
      status: "confirmed",
      selected: {
        setid: ids.setid,
        title: item.reference_data?.match_title || item.name,
        url: labelUrl(ids.setid),
        score: 1000,
        confidence: "confirmed",
        reasons: ["Label confirmed by you"],
      },
      candidates: [],
      excludedCount: 0,
      reasons: ["Label confirmed by you"],
    };
  }
  if (!ids.name && !ids.ndc) return { status: "needs_review", selected: null, candidates: [], excludedCount: 0, reasons: ["No name to search"] };

  const [byName, byNdc] = await Promise.all([
    ids.name ? fetchSplList(ids.name) : null,
    ids.ndc ? fetchSplListByNdc(ids.ndc).catch(() => null) : null,
  ]);
  const combined = [...(byNdc || []).map(candidate => ({ ...candidate, ndcMatch: true })), ...(byName || [])];
  return selectLabel(combined, ids);
}

export function matchCacheKey(item) {
  const ids = itemIdentifiers(item);
  const decision = ids.status === "confirmed" || ids.status === "no_label" ? ids.status : "";
  return [
    CACHE_VERSION, ids.name, ids.category, decision, decision === "confirmed" ? ids.setid : "", ids.activeIngredients.join("+"),
    ids.manufacturer, ids.ndc, ids.dosageForm, ids.strength,
  ].join("|");
}

export function labelUrl(setid) {
  return `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setid)}`;
}

export function publicCandidate(candidate) {
  return {
    setid: candidate.setid,
    title: candidate.title,
    brand: candidate.brand,
    generic: candidate.generic,
    labeler: candidate.labeler,
    form: candidate.form,
    score: candidate.score,
    confidence: candidate.confidence,
    reasons: candidate.reasons,
    url: candidate.url,
  };
}
