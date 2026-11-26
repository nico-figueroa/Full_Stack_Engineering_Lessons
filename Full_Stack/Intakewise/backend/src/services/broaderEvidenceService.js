import fetch from "node-fetch";
import { normalizeText } from "./labelMatcher.js";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_REFERENCES_PER_SOURCE = 3;
const EVIDENCE_CACHE_TTL = 12 * 60 * 60 * 1000;
const evidenceCache = new Map();
const evidenceInFlight = new Map();

function cleanTerm(item) {
  const ingredients = item.reference_data?.active_ingredients;
  if (Array.isArray(ingredients) && ingredients[0]) return normalizeText(ingredients[0]);
  if (typeof ingredients === "string" && ingredients.trim()) {
    return normalizeText(ingredients.split(/[,;+]|\band\b/i)[0]);
  }
  return normalizeText(item.name);
}

async function requestJson(url, source, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${source} request failed with HTTP ${response.status}`);
  return response.json();
}

export async function fetchRxNormEvidence(term, fetcher = fetch) {
  const value = encodeURIComponent(term);
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${value}&maxEntries=3&option=1`;
  const data = await requestJson(url, "RxNorm", fetcher);
  const candidates = data?.approximateGroup?.candidate || [];
  const best = [...candidates].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  if (!best?.rxcui) return null;
  let normalizedName = best.name || term;
  const relatedUrl = `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(best.rxcui)}/related.json?tty=IN`;
  const related = await requestJson(relatedUrl, "RxNorm", fetcher);
  const ingredient = related?.relatedGroup?.conceptGroup
    ?.flatMap(group => group.conceptProperties || [])
    .find(value => value?.name);
  if (ingredient?.name) normalizedName = ingredient.name;
  return {
    rxcui: String(best.rxcui),
    name: normalizedName,
    matchedName: best.name || term,
    score: Number(best.score || 0),
    sourceUrl: `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(best.rxcui)}/allProperties.json?prop=names`,
  };
}

export async function fetchPubMedReferences(term, fetcher = fetch) {
  const query = `"${term}"[Title/Abstract] AND (drug interactions OR adverse effects OR safety)`;
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmode: "json",
    retmax: String(MAX_REFERENCES_PER_SOURCE),
    sort: "relevance",
    tool: "intakewise",
  });
  if (process.env.PUBLIC_DATA_CONTACT_EMAIL) params.set("email", process.env.PUBLIC_DATA_CONTACT_EMAIL);
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`;
  const search = await requestJson(searchUrl, "PubMed", fetcher);
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    tool: "intakewise",
  });
  if (process.env.PUBLIC_DATA_CONTACT_EMAIL) summaryParams.set("email", process.env.PUBLIC_DATA_CONTACT_EMAIL);
  const summaries = await requestJson(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${summaryParams}`,
    "PubMed",
    fetcher,
  );
  return ids.map(id => {
    const result = summaries?.result?.[id];
    return {
      source: "PubMed",
      kind: "research",
      title: result?.title || `PubMed record ${id}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`,
      published: result?.pubdate || null,
      authors: Array.isArray(result?.authors)
        ? result.authors.slice(0, 3).map(author => author.name).filter(Boolean)
        : [],
    };
  });
}

export async function fetchMedlinePlusReferences(normalization, term, fetcher = fetch) {
  if (!normalization?.rxcui) return [];
  const params = new URLSearchParams({
    "mainSearchCriteria.v.cs": "2.16.840.1.113883.6.88",
    "mainSearchCriteria.v.c": normalization.rxcui,
    "mainSearchCriteria.v.dn": normalization.name || term,
    "informationRecipient.languageCode.c": "en",
    knowledgeResponseType: "application/json",
  });
  const data = await requestJson(`https://connect.medlineplus.gov/service?${params}`, "MedlinePlus", fetcher);
  return collectLinkedEntries(data)
    .slice(0, MAX_REFERENCES_PER_SOURCE)
    .map(entry => ({ ...entry, source: "MedlinePlus", kind: "patient_education" }));
}

export async function fetchNihSupplementReferences(term, fetcher = fetch) {
  const params = new URLSearchParams({ method: "factsheet", term });
  const data = await requestJson(
    `https://api.ods.od.nih.gov/dsld/v9/ingredient-groups/?${params}`,
    "NIH ODS",
    fetcher,
  );
  return collectLinkedEntries(data)
    .filter(entry => normalizeText(entry.title).includes(normalizeText(term)))
    .slice(0, MAX_REFERENCES_PER_SOURCE)
    .map(entry => ({ ...entry, source: "NIH ODS", kind: "supplement_factsheet" }));
}

export function collectLinkedEntries(value, output = [], depth = 0) {
  if (!value || depth > 5) return output;
  if (Array.isArray(value)) {
    for (const entry of value) collectLinkedEntries(entry, output, depth + 1);
    return output;
  }
  if (typeof value !== "object") return output;

  const linkArray = Array.isArray(value.link) ? value.link : [];
  const url = value.url || value.href || (typeof value.link === "string" ? value.link : null)
    || linkArray.find(link => typeof link?.href === "string")?.href
    || value.factsheet_url || value.webpage_url;
  const rawTitle = value.title || value.name || value.displayName || value.term;
  const title = typeof rawTitle === "object" ? rawTitle?._value || rawTitle?.value || rawTitle?.text : rawTitle;
  if (typeof url === "string" && /^https?:\/\//i.test(url) && typeof title === "string") {
    if (!output.some(entry => entry.url === url)) output.push({ title, url });
  }
  for (const nested of Object.values(value)) collectLinkedEntries(nested, output, depth + 1);
  return output;
}

export async function getBroaderEvidence(item) {
  const term = cleanTerm(item);
  const cacheKey = `broader-v1:${term}`;
  const cached = evidenceCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < EVIDENCE_CACHE_TTL) {
    return structuredClone(cached.value);
  }
  if (!term) return {
    normalization: null,
    research: [],
    patientEducation: [],
    supplementReferences: [],
    sourceErrors: [],
  };
  const pending = evidenceInFlight.get(cacheKey);
  if (pending) return structuredClone(await pending);

  const load = loadBroaderEvidence(term);
  evidenceInFlight.set(cacheKey, load);
  try {
    const result = await load;
    return structuredClone(result);
  } finally {
    evidenceInFlight.delete(cacheKey);
  }
}

async function loadBroaderEvidence(term) {
  const cacheKey = `broader-v1:${term}`;
  const result = {
    normalization: null,
    research: [],
    patientEducation: [],
    supplementReferences: [],
    sourceErrors: [],
  };
  try {
    result.normalization = await fetchRxNormEvidence(term);
  } catch (error) {
    result.sourceErrors.push(`RxNorm: ${error.message}`);
  }

  const tasks = [
    ["PubMed", () => fetchPubMedReferences(term), value => { result.research = value; }],
    ["MedlinePlus", () => fetchMedlinePlusReferences(result.normalization, term), value => {
      result.patientEducation = value;
    }],
    ["NIH ODS", () => fetchNihSupplementReferences(term), value => { result.supplementReferences = value; }],
  ];
  const settled = await Promise.allSettled(tasks.map(([, task]) => task()));
  settled.forEach((entry, index) => {
    const [source, , apply] = tasks[index];
    if (entry.status === "fulfilled") apply(entry.value);
    else result.sourceErrors.push(`${source}: ${entry.reason.message}`);
  });
  if (!result.sourceErrors.length) evidenceCache.set(cacheKey, {
    fetchedAt: Date.now(),
    value: structuredClone(result),
  });
  return result;
}
