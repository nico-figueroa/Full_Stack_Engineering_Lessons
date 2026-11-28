import fetch from "node-fetch";
import {
  externalServiceUrl,
  publicDataRequestTimeoutMs,
} from "../config/externalServices.js";

export async function fetchFdaSrsData(normalizedName) {
  const url = `${externalServiceUrl("FDA_SRS_API_URL")}?name=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(publicDataRequestTimeoutMs()) });
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
