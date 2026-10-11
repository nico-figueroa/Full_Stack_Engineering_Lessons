import fetch from "node-fetch";

const DAILYMED_SEARCH_URL =
  "https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json";

export async function fetchFromDailyMed(normalizedName) {
  const url = `${DAILYMED_SEARCH_URL}?drug_name=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url);
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
