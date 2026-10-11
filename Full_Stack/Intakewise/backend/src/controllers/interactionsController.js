import { analyzeInteractions } from "../services/interactionEngine.js";
import pool from "../config/db.js";

export async function getInteractions(req, res) {
  const itemsResult = await pool.query(
    `SELECT * FROM items WHERE user_id = $1`,
    [req.user.id]
  );

  const interactions = await analyzeInteractions(itemsResult.rows);

  const dayParts = { morning: "morning", noon: "noon", afternoon: "afternoon", evening: "evening", bedtime: "bedtime", night: "bedtime" };
  for (let leftIndex = 0; leftIndex < itemsResult.rows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < itemsResult.rows.length; rightIndex += 1) {
      const left = itemsResult.rows[leftIndex];
      const right = itemsResult.rows[rightIndex];
      const leftName = String(left.name || "").trim().toLowerCase();
      const rightName = String(right.name || "").trim().toLowerCase();
      if (leftName && leftName === rightName && left.dosage_per_intake !== right.dosage_per_intake) {
        addNotice(interactions[leftIndex], {
          kind: "dose_entry_mismatch",
          description: `Two items named "${left.name}" have different saved dosages. Verify both entries with a pharmacist; this is not a dose recommendation.`,
          severity: "review",
          source: "Saved schedule comparison",
        });
        addNotice(interactions[rightIndex], {
          kind: "dose_entry_mismatch",
          description: `Two items named "${right.name}" have different saved dosages. Verify both entries with a pharmacist; this is not a dose recommendation.`,
          severity: "review",
          source: "Saved schedule comparison",
        });
      }

      const leftTimes = (left.times_of_day || ["morning"]).map(time => dayParts[String(time).toLowerCase()] || String(time).toLowerCase());
      const rightTimes = (right.times_of_day || ["morning"]).map(time => dayParts[String(time).toLowerCase()] || String(time).toLowerCase());
      const sharedTime = leftTimes.find(time => rightTimes.includes(time));
      if (sharedTime) {
        const notice = {
          kind: "schedule_overlap",
          description: `${left.name} and ${right.name} are both scheduled for ${sharedTime}. This is a schedule overlap, not a determination that taking them together is unsafe; verify timing instructions with a healthcare professional.`,
          severity: "review",
          source: "Schedule comparison",
        };
        addNotice(interactions[leftIndex], notice);
        addNotice(interactions[rightIndex], notice);
      }
    }
  }

  res.json({ interactions });
}

function addNotice(item, notice) {
  if (item && !item.warnings.some(existing => existing.kind === notice.kind && existing.description === notice.description)) {
    item.warnings.push(notice);
  }
}
