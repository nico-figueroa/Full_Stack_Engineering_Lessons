const SECTION_KEYS = {
  contraindications: ["contraindications"],
  interactions: ["drug interactions", "drug interaction"],
  foodInteractions: ["food interactions", "food interaction"],
  warnings: ["warnings", "precautions", "boxed warning"],
  pharmacology: ["clinical pharmacology", "mechanism of action", "pharmacodynamics"],
};

export function extractProfileSections(xml) {
  const profile = Object.fromEntries(Object.keys(SECTION_KEYS).map(key => [key, []]));
  const visit = value => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const title = text(value.title).toLowerCase();
    const content = text(value.text);
    for (const [key, markers] of Object.entries(SECTION_KEYS)) {
      if (content && markers.some(marker => title.includes(marker))) {
        if (!profile[key].includes(content)) profile[key].push(content);
      }
    }
    Object.values(value).forEach(child => {
      if (child && typeof child === "object") visit(child);
    });
  };
  visit(xml?.document);
  return profile;
}

function text(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, child]) => text(child))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export function extractInteractionsFromSplXml(xml) {
  const sections = extractProfileSections(xml);
  return [...sections.interactions, ...sections.warnings, ...sections.contraindications, ...sections.foodInteractions];
}
