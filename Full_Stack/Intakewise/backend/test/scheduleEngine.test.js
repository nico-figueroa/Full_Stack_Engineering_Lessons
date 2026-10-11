import { expect } from "chai";
import { buildSchedule } from "../src/services/scheduleEngine.js";

describe("buildSchedule", () => {
  const items = [
    { id: 1, name: "Daily item", dosage_per_intake: "1 tablet", frequency: "daily", times_of_day: ["morning", "evening"] },
    { id: 2, name: "Weekly item", dosage_per_intake: "1 capsule", frequency: "weekly", times_of_day: ["noon"] },
  ];

  it("builds sorted daily entries and maps day periods to calendar times", () => {
    const schedule = buildSchedule(items, [], "2026-10-09", "2026-10-10");
    expect(schedule.map(entry => [entry.date, entry.time])).to.deep.equal([
      ["2026-10-09", "08:00"], ["2026-10-09", "18:00"],
      ["2026-10-10", "08:00"], ["2026-10-10", "18:00"],
    ]);
  });

  it("schedules weekly entries on Monday", () => {
    const schedule = buildSchedule(items, [], "2026-10-12", "2026-10-12");
    expect(schedule.map(entry => entry.name)).to.include("Weekly item");
  });

  it("replaces matching proposals, supports one-off times, and removes skipped entries", () => {
    const overrides = [
      { id: 8, item_id: 1, date: "2026-10-09", time: "08:00", dosage: "2 tablets", notes: "Changed dose" },
      { id: 9, item_id: 1, date: "2026-10-09", time: "10:15", dosage: "1 tablet" },
      { id: 10, item_id: 1, date: "2026-10-09", time: "18:00", is_skipped: true },
    ];
    const schedule = buildSchedule(items, overrides, "2026-10-09", "2026-10-09");
    expect(schedule).to.have.length(2);
    expect(schedule[0]).to.include({ source: "override", time: "08:00", dosage: "2 tablets", override_id: 8 });
    expect(schedule[1]).to.include({ source: "override", time: "10:15" });
  });

  it("does not propose as-needed doses but still renders their overrides", () => {
    const asNeeded = [{ id: 3, name: "PRN item", dosage_per_intake: "1 tablet", frequency: "as_needed", times_of_day: ["morning"] }];
    expect(buildSchedule(asNeeded, [], "2026-10-09", "2026-10-15")).to.deep.equal([]);
    const schedule = buildSchedule(asNeeded, [{ id: 11, item_id: 3, date: "2026-10-10", time: "13:00", dosage: "1 tablet" }], "2026-10-09", "2026-10-15");
    expect(schedule).to.have.length(1);
    expect(schedule[0]).to.include({ source: "override", time: "13:00" });
  });

  it("rejects invalid and reversed ranges", () => {
    expect(() => buildSchedule(items, [], "2026-02-30", "2026-03-01")).to.throw(RangeError);
    expect(() => buildSchedule(items, [], "2026-10-11", "2026-10-10")).to.throw(RangeError);
    expect(() => buildSchedule(items, [], "2026-01-01", "2027-01-02")).to.throw(RangeError);
  });
});
