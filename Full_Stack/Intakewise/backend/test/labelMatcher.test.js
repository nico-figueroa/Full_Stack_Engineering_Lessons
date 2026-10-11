import { expect } from "chai";
import {
  itemIdentifiers,
  matchCacheKey,
  parseLabelTitle,
  resolveDailyMedLabel,
  selectLabel,
} from "../src/services/labelMatcher.js";

const MILI_AUROBINDO = {
  setid: "76f14485-321d-4d4f-a3b0-aab195fd0dd1",
  title: "MILI (NORGESTIMATE AND ETHINYL ESTRADIOL) KIT [AUROBINDO PHARMA LIMITED]",
};
const MILI_ASMED = {
  setid: "38d8c4ec-790b-4ff5-9d08-0ae230491e47",
  title: "MILI (NORGESTIMATE AND ETHINYL ESTRADIOL) KIT [A-S MEDICATION SOLUTIONS]",
};
const DEODORANT = {
  setid: "aaaaaaaa-0000-0000-0000-000000000001",
  title: "MILLIONAIRE ANTIPERSPIRANT DEODORANT (ALUMINUM ZIRCONIUM TETRACHLOROHYDREX GLY) STICK [ACME COSMETICS]",
};
const medication = (name, referenceData = {}) => ({ name, category: "medication", reference_data: referenceData });

describe("DailyMed label matcher", () => {
  it("parses brand, generic, form and labeler from SPL titles", () => {
    expect(parseLabelTitle(MILI_AUROBINDO.title)).to.deep.equal({
      brand: "mili",
      generic: "norgestimate and ethinyl estradiol",
      form: "kit",
      labeler: "aurobindo pharma limited",
    });
  });

  it("never auto-selects a cosmetic label for a medication (the 'Milli' false match)", () => {
    const result = selectLabel([DEODORANT], itemIdentifiers(medication("Milli")));
    expect(result.status).to.equal("needs_review");
    expect(result.selected).to.equal(null);
    expect(result.excludedCount).to.equal(1);
  });

  it("auto-selects an exact brand match", () => {
    const result = selectLabel([DEODORANT, MILI_AUROBINDO, MILI_ASMED], itemIdentifiers(medication("Mili")));
    expect(result.status).to.equal("auto");
    expect(result.selected.generic).to.equal("norgestimate and ethinyl estradiol");
    expect(result.candidates.map(c => c.setid)).to.not.include(DEODORANT.setid);
  });

  it("asks for review when equally good labels have different active ingredients", () => {
    const list = [
      { setid: "bbbbbbbb-0000-0000-0000-000000000001", title: "ZEN (DRUG ALPHA) TABLET [LAB ONE]" },
      { setid: "bbbbbbbb-0000-0000-0000-000000000002", title: "ZEN (DRUG BETA) TABLET [LAB TWO]" },
    ];
    expect(selectLabel(list, itemIdentifiers(medication("Zen"))).status).to.equal("needs_review");
  });

  it("uses active ingredients to break ties and penalize mismatches", () => {
    const list = [
      { setid: "bbbbbbbb-0000-0000-0000-000000000001", title: "ZEN (DRUG ALPHA) TABLET [LAB ONE]" },
      { setid: "bbbbbbbb-0000-0000-0000-000000000002", title: "ZEN (DRUG BETA) TABLET [LAB TWO]" },
    ];
    const result = selectLabel(list, itemIdentifiers(medication("Zen", { active_ingredients: "drug beta" })));
    expect(result.status).to.equal("auto");
    expect(result.selected.setid).to.equal("bbbbbbbb-0000-0000-0000-000000000002");
  });

  it("prefers the labeler that matches the manufacturer", () => {
    const result = selectLabel(
      [MILI_ASMED, MILI_AUROBINDO],
      itemIdentifiers(medication("Mili", { manufacturer: "Aurobindo" }))
    );
    expect(result.selected.setid).to.equal(MILI_AUROBINDO.setid);
  });

  it("returns a user-confirmed label without calling DailyMed", async () => {
    const result = await resolveDailyMedLabel(medication("Milli", {
      match_status: "confirmed",
      dailymed_setid: MILI_AUROBINDO.setid,
      match_title: MILI_AUROBINDO.title,
    }));
    expect(result.status).to.equal("confirmed");
    expect(result.selected.setid).to.equal(MILI_AUROBINDO.setid);
  });

  it("respects a 'no official label' decision", async () => {
    const result = await resolveDailyMedLabel(medication("Homemade tea", { match_status: "no_label" }));
    expect(result.status).to.equal("no_label");
    expect(result.selected).to.equal(null);
  });

  it("changes the cache key when identifiers or user decisions change, but not for automatic status", () => {
    const base = matchCacheKey(medication("Mili"));
    expect(matchCacheKey(medication("Mili", { match_status: "needs_review" }))).to.equal(base);
    expect(matchCacheKey(medication("Mili", { manufacturer: "Aurobindo" }))).to.not.equal(base);
    expect(matchCacheKey(medication("Mili", { match_status: "confirmed", dailymed_setid: MILI_ASMED.setid }))).to.not.equal(base);
  });
});
