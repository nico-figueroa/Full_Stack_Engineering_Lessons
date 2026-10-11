import { expect } from "chai";
import { extractProfileSections } from "../src/services/dailymedExtractor.js";

describe("extractProfileSections", () => {
  it("extracts source label sections without inventing missing details", () => {
    const result = extractProfileSections({
      document: {
        section: [
          { title: "Warnings and Precautions", text: { paragraph: "Use as described on the label." } },
          { title: "Drug Interactions", text: "Review interactions with a pharmacist." },
          { title: "Indications", text: "Unrelated indication." },
        ],
      },
    });
    expect(result.warnings).to.deep.equal(["Use as described on the label."]);
    expect(result.interactions).to.deep.equal(["Review interactions with a pharmacist."]);
    expect(result.contraindications).to.deep.equal([]);
  });

  it("returns empty sections when the service has no match", () => {
    expect(extractProfileSections(null)).to.deep.equal({
      contraindications: [], interactions: [], foodInteractions: [], warnings: [], pharmacology: [],
    });
  });
});
