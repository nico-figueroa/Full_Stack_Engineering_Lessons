import fetch from "node-fetch";

const NIH_URL =
  "https://ods.od.nih.gov/api/supplement.json";

export async function fetchNihSupplementData(normalizedName) {
  const url = `${NIH_URL}?ingredient=${encodeURIComponent(normalizedName)}`;

  const res = await fetch(url);
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