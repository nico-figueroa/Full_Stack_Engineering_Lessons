import pool from "../config/db.js";

export async function getStock(req, res) {
  const items = await pool.query(
    `SELECT * FROM items WHERE user_id = $1`,
    [req.user.id]
  );

  const stock = items.rows.map(item => {
    const averageDosesPerDay = dosesPerDay(item.frequency, item.times_of_day?.length || 1);
    const quantity = item.container_quantity;
    const daysRemaining = Number.isFinite(quantity) && averageDosesPerDay > 0 ? Math.floor(quantity / averageDosesPerDay) : null;
    const runout = daysRemaining === null ? null : new Date(Date.now() + daysRemaining * 86400000).toISOString().slice(0, 10);
    return {
      item_id: item.id,
      name: item.name,
      remaining: quantity,
      projected_runout: runout,
      days_remaining: daysRemaining,
      estimate_note: "Estimate assumes every scheduled intake consumes one unit; record actual usage separately.",
    };
  });

  res.json({ stock });
}

function dosesPerDay(frequency, timesPerDay) {
  const value = String(frequency || "daily").toLowerCase();
  if (value === "as_needed") return 0;
  if (value === "weekly") return timesPerDay / 7;
  if (value === "weekdays") return timesPerDay * 5 / 7;
  const interval = value.match(/^every:(\d+)days?$/);
  if (interval) return timesPerDay / Number(interval[1]);
  return timesPerDay;
}
