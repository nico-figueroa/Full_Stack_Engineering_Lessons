import { getExternalInteractionsForItem, normalizeWarnings } from "./externalDataService.js";

export async function analyzeInteractions(items) {
  const results = await Promise.all(items.map(async item => {
    const savedWarnings = (Array.isArray(item.warnings) ? item.warnings : []).filter(value => typeof value === "string").map(description => ({
      description,
      severity: "review",
      source: "User-entered note",
      sourceUrl: item.reference_data?.source_url || null,
    }));
    const external = await getExternalInteractionsForItem(item);
    const externalWarnings = normalizeWarnings(external).map(warning => typeof warning === "string"
      ? { description: warning, severity: "review", source: "DailyMed", sourceUrl: "https://dailymed.nlm.nih.gov/dailymed/" }
      : warning);
    return {
      item_id: item.id,
      name: item.name,
      warnings: [...savedWarnings, ...externalWarnings],
      sources: [...new Set(externalWarnings.map(warning => warning.sourceUrl).filter(Boolean))],
    };
  }));

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      const leftName = String(left.name || "").trim().toLowerCase();
      const rightName = String(right.name || "").trim().toLowerCase();
      if (!leftName || !rightName) continue;

      const matched = [
        ...results[leftIndex].warnings.map(warning => ({ warning, sourceItem: left })),
        ...results[rightIndex].warnings.map(warning => ({ warning, sourceItem: right })),
      ].filter(({ warning, sourceItem }) => warning.sourceUrl && warning.description.toLowerCase().includes(
        String(sourceItem.id) === String(left.id) ? rightName : leftName
      ));

      for (const { warning, sourceItem } of matched) {
        const notice = {
          kind: "source_name_match",
          description: `An official label for ${sourceItem.name} mentions ${String(sourceItem.id) === String(left.id) ? right.name : left.name}: ${warning.description}`,
          severity: warning.severity || "review",
          source: warning.source,
          sourceUrl: warning.sourceUrl,
        };
        results[leftIndex].warnings.push(notice);
        results[rightIndex].warnings.push(notice);
      }
    }
  }
  return results;
}
