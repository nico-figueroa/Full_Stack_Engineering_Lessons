import { expect } from "chai";
import {
  collectLinkedEntries,
  fetchPubMedReferences,
  fetchRxNormEvidence,
} from "../src/services/broaderEvidenceService.js";

describe("broader evidence service", () => {
  it("normalizes a drug through the highest-scoring RxNorm candidate", async () => {
    const fetcher = async () => ({
      ok: true,
      async json() {
        return {
          approximateGroup: {
            candidate: [
              { rxcui: "1", name: "weaker", score: "40" },
              { rxcui: "2", name: "magnesium", score: "100" },
            ],
          },
        };
      },
    });

    const result = await fetchRxNormEvidence("magnesium", fetcher);
    expect(result).to.include({ rxcui: "2", name: "magnesium", score: 100 });
    expect(result.sourceUrl).to.include("rxcui/2");
  });

  it("creates source-linked PubMed references without treating citations as clinical conclusions", async () => {
    const requests = [];
    const fetcher = async url => {
      requests.push(url);
      return {
        ok: true,
        async json() {
          if (url.includes("esearch")) return { esearchresult: { idlist: ["123"] } };
          return {
            result: {
              123: {
                title: "A safety study",
                pubdate: "2025",
                authors: [{ name: "One" }, { name: "Two" }],
              },
            },
          };
        },
      };
    };

    const references = await fetchPubMedReferences("magnesium", fetcher);
    expect(references).to.deep.include({
      source: "PubMed",
      kind: "research",
      title: "A safety study",
      url: "https://pubmed.ncbi.nlm.nih.gov/123/",
      published: "2025",
      authors: ["One", "Two"],
    });
    expect(requests).to.have.length(2);
  });

  it("collects linked feed entries and removes duplicate URLs", () => {
    const payload = {
      feed: {
        entry: [
          { title: { _value: "Medication guide" }, link: [{ href: "https://example.test/guide" }] },
          { title: "Medication guide", url: "https://example.test/guide" },
        ],
      },
    };
    expect(collectLinkedEntries(payload)).to.deep.equal([
      { title: "Medication guide", url: "https://example.test/guide" },
    ]);
  });
});
