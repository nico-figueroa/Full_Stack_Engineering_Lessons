import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const SPL_SEARCH_URL =
  "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json";

const PAGE_SIZE = 100;

async function searchSpls(params) {
  const query = new URLSearchParams({ ...params, pagesize: String(PAGE_SIZE) });
  const res = await fetch(`${SPL_SEARCH_URL}?${query}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`DailyMed search failed with HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data.data) || data.data.length === 0) return null;
  return data.data;
}

export async function fetchSplList(normalizedName) {
  return searchSpls({ drug_name: normalizedName });
}

export async function fetchSplListByNdc(ndc) {
  const value = String(ndc || "").trim();
  if (!/^[0-9-]{5,14}$/.test(value)) return null;
  return searchSpls({ ndc: value });
}

export async function fetchSplXml(splId) {
  if (!/^[a-f0-9-]+$/i.test(splId)) throw new Error("DailyMed returned an invalid SPL identifier");
  const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${splId}.xml`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`DailyMed label request failed with HTTP ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xml);
}