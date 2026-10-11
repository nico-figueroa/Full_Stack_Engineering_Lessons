import fetch from "node-fetch";

const SRS_URL =
  "https://precision.fda.gov/srs/api/v1/substances";

export async function fetchFdaSrsData(normalizedName) {
  const url = `${SRS_URL}?name=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  return data.results;
}

export function extractSrsWarnings(results) {
  const warnings = [];

  results.forEach(r => {
    if (r.definition) {
      warnings.push(`FDA SRS Definition: ${r.definition}`);
    }
    if (r.synonyms) {
      warnings.push(`FDA SRS Synonyms: ${r.synonyms.join(", ")}`);
    }
  });

  return warnings;
}
