const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HOURS = {
  morning: "08:00",
  noon: "12:00",
  afternoon: "14:00",
  evening: "18:00",
  bedtime: "21:00",
  night: "21:00",
};

export function buildSchedule(items, overrides, from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (start === null || end === null || start > end) {
    throw new RangeError("A valid date range is required");
  }
  if (end - start > 365 * DAY_MS) {
    throw new RangeError("Schedule range cannot exceed 366 days");
  }

  const itemById = new Map(items.map(item => [String(item.id), item]));
  const overrideMap = new Map();
  for (const override of overrides) {
    overrideMap.set(scheduleKey(normalizeDate(override.date), override.item_id, override.time), override);
  }

  const schedule = [];
  for (let stamp = start; stamp <= end; stamp += DAY_MS) {
    const date = new Date(stamp).toISOString().slice(0, 10);
    const weekday = new Date(stamp).getUTCDay();
    for (const item of items) {
      if (!shouldScheduleToday(item.frequency, weekday, Math.floor(stamp / DAY_MS))) continue;
      for (const time of resolveTimes(item)) {
        const key = scheduleKey(date, item.id, time);
        const override = overrideMap.get(key);
        if (override?.is_skipped) {
          overrideMap.delete(key);
          continue;
        }
        schedule.push({
          item_id: item.id,
          name: item.name,
          date,
          time,
          dosage: override?.dosage ?? item.dosage_per_intake ?? "",
          source: override ? "override" : "proposal",
          notes: override?.notes || null,
          warning: (item.warnings || []).length > 0,
          warning_details: item.warnings || [],
          override_id: override?.id ?? null,
        });
        if (override) overrideMap.delete(key);
      }
    }
  }

  for (const override of overrideMap.values()) {
    if (override.is_skipped) continue;
    const date = normalizeDate(override.date);
    if (date < from || date > to) continue;
    const item = itemById.get(String(override.item_id));
    if (!item) continue;
    schedule.push({
      item_id: item.id,
      name: item.name,
      date,
      time: override.time,
      dosage: override.dosage ?? item.dosage_per_intake ?? "",
      source: "override",
      notes: override.notes || null,
      warning: (item.warnings || []).length > 0,
      warning_details: item.warnings || [],
      override_id: override.id ?? null,
    });
  }

  return schedule.sort((a, b) => a.date.localeCompare(b.date) || timeMinutes(a.time) - timeMinutes(b.time));
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const stamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(stamp) || new Date(stamp).toISOString().slice(0, 10) !== value ? null : stamp;
}

function normalizeDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function scheduleKey(date, itemId, time) {
  return `${date}|${itemId}|${time}`;
}

function resolveTimes(item) {
  const values = Array.isArray(item.times_of_day) ? item.times_of_day : [];
  return (values.length ? values : ["morning"]).map(value => DEFAULT_HOURS[value.toLowerCase()] || value);
}

function shouldScheduleToday(frequency = "daily", weekday, dayNumber) {
  const normalized = String(frequency).toLowerCase();
  if (normalized === "as_needed") return false;
  if (normalized === "weekly") return weekday === 1;
  if (normalized.startsWith("weekly:")) return weekday === Number(normalized.split(":")[1]);
  if (normalized === "weekdays") return weekday >= 1 && weekday <= 5;
  const interval = normalized.match(/^every:(\d+)days?$/);
  if (interval) return dayNumber % Number(interval[1]) === 0;
  return normalized === "daily" || normalized === "custom";
}

function timeMinutes(value) {
  const matched = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (matched) return Number(matched[1]) * 60 + Number(matched[2]);
  const labels = {
    morning: 8 * 60,
    noon: 12 * 60,
    afternoon: 14 * 60,
    evening: 18 * 60,
    bedtime: 21 * 60,
    night: 21 * 60,
  };
  return labels[String(value).toLowerCase()] ?? 24 * 60;
}
