import fetch from "node-fetch";
import {
  externalServiceUrl,
  publicDataRequestTimeoutMs,
} from "../config/externalServices.js";

export async function fetchNihSupplementData(normalizedName) {
  const url = `${externalServiceUrl("NIH_ODS_SUPPLEMENT_API_URL")}?ingredient=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(publicDataRequestTimeoutMs()) });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || data.length === 0) return null;

  return data;
}

export function extractNihWarnings(data) {
  const warnings = [];

  data.forEach(entry => {
    if (entry.warnings) {
      warnings.push(`NIH Warning: ${entry.warnings}`);
    }
    if (entry.interactions) {
      warnings.push(`NIH Interaction: ${entry.interactions}`);
    }
  });

  return warnings;
}