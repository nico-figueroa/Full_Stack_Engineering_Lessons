import fetch from "node-fetch";
import {
  externalServiceUrl,
  publicDataRequestTimeoutMs,
} from "../config/externalServices.js";

export async function fetchFromDailyMed(normalizedName) {
  const url = `${externalServiceUrl("DAILYMED_API_BASE_URL", "drugnames.json")}?drug_name=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(publicDataRequestTimeoutMs()) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;

  // For now, just return the raw payload
  return data.data;
}

export function extractWarningsFromDailyMed(dailymedData) {
  // Placeholder: later you’ll fetch full SPL documents and parse sections.
  // For now, just return a generic warning if there’s a match.
  if (!dailymedData || dailymedData.length === 0) return [];

  return [
    "This item appears in DailyMed; review official labeling for interactions and warnings."
  ];
}
