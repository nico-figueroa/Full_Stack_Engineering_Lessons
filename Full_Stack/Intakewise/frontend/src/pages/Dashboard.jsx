import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import api from "../api/client";
import Card from "../components/ui/Card.jsx";
import { useToast } from "../context/useToast.js";

function dateParam(date) {
  return format(date, "yyyy-MM-dd");
}

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [stock, setStock] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [today] = useState(() => startOfDay(new Date()));
  const todayString = dateParam(today);

  useEffect(() => {
    Promise.all([
      api.get("/items"),
      api.get("/schedule", { params: { from: todayString, to: dateParam(addDays(today, 7)) } }),
      api.get("/stock"),
      api.get("/interactions"),
    ]).then(([itemResponse, scheduleResponse, stockResponse, interactionResponse]) => {
      setItems(itemResponse.data);
      setSchedule(scheduleResponse.data.schedule);
      setStock(stockResponse.data.stock);
      setInteractions(interactionResponse.data.interactions);
    }).catch(error => showToast("error", error.response?.data?.error || "Some dashboard information could not be loaded."))
      .finally(() => setLoading(false));
  }, [today, todayString, showToast]);

  const todaysSchedule = useMemo(() => schedule.filter(entry => entry.date === todayString), [schedule, todayString]);
  const warnings = interactions.flatMap(result => (result.warnings || []).map((warning, index) => ({
    ...warning,
    text: typeof warning === "string" ? warning : warning.description,
    key: `${result.item_id}-${index}`,
    itemId: result.item_id,
    name: result.name,
  })));
  const upcoming = schedule.filter(entry => entry.date > todayString).slice(0, 6);

  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div><p className="text-sm font-medium text-violet-300">{format(today, "EEEE, MMMM d")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your day, at a glance.</h1><p className="mt-3 max-w-xl text-slate-300">A calmer way to keep track of your schedule. Plans are yours to adjust.</p></div>
          <div className="flex flex-wrap gap-2">
            <Link to="/items?new=1" className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950">＋ Add item</Link>
            <Link to="/calendar?new=1" className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-950">＋ Add override</Link>
          </div>
        </div>
      </section>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Today’s doses", todaysSchedule.length, "scheduled intakes", "text-violet-700"],
          ["Active warnings", warnings.length, "to review", "text-amber-600"],
          ["In your list", items.length, "tracked items", "text-sky-700"],
          ["Low stock", stock.filter(item => item.days_remaining !== null && item.days_remaining <= 7).length, "items to check", "text-rose-600"],
        ].map(([label, value, detail, color]) => <Card key={label} className="mb-0"><p className="text-sm text-slate-500">{label}</p><p className={`mt-3 text-3xl font-semibold ${color} dark:text-violet-300`}>{loading ? "—" : value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></Card>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card title="Today’s schedule">
          {loading ? <p className="py-8 text-sm text-slate-500">Loading your schedule…</p> : todaysSchedule.length === 0 ? <p className="py-8 text-sm text-slate-500">Nothing scheduled today. Add an item or create a one-time override.</p> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{todaysSchedule.map((entry, index) => <li key={`${entry.item_id}-${entry.time}-${index}`} className="flex items-center gap-4 py-3"><span className="w-14 text-sm font-semibold text-violet-700 dark:text-violet-300">{entry.time}</span><span className="min-w-0 flex-1"><Link className="font-medium hover:text-violet-700" to={`/items/${entry.item_id}`}>{entry.name}</Link><span className="block text-xs text-slate-500">{entry.dosage || "Dose not set"}{entry.source === "override" ? " · adjusted" : ""}</span></span>{entry.warning && <span aria-label="Has warning" className="text-amber-500">⚠</span>}</li>)}</ul>}
        </Card>
        <Card title="Active warnings">
          {warnings.length === 0 ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">No active warnings were returned for your saved items. This does not confirm that combinations are safe.</div> :
            <ul className="space-y-3">{warnings.slice(0, 5).map(warning => <li key={warning.key} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"><Link to={`/interactions/${warning.itemId}`} state={{ from: "/" }} className="font-semibold text-amber-900 hover:underline dark:text-amber-200">{warning.name}</Link><p className="mt-1 text-amber-800 dark:text-amber-300">{warning.text}</p></li>)}</ul>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Warnings are informational, may be incomplete, and are not a substitute for advice from a pharmacist or clinician.</p>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Coming up">
          {upcoming.length ? <ul className="space-y-3">{upcoming.map((entry, index) => <li key={`${entry.item_id}-${entry.date}-${entry.time}-${index}`} className="flex justify-between gap-4 text-sm"><span className="font-medium">{entry.name}<span className="block text-xs text-slate-500">{format(parseISO(`${entry.date}T12:00:00`), "EEE, MMM d")} · {entry.time}</span></span><span className="text-slate-500">{entry.dosage}</span></li>)}</ul> : <p className="text-sm text-slate-500">No upcoming doses in the next week.</p>}
        </Card>
        <Card title="Recently added">
          {items.length ? <ul className="space-y-3">{[...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 4).map(item => <li key={item.id} className="flex items-center justify-between gap-4 text-sm"><Link to={`/items/${item.id}`} className="font-medium hover:text-violet-700">{item.name}</Link><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.category}</span></li>)}</ul> : <p className="text-sm text-slate-500">Your recently added items will appear here.</p>}
          <Link to="/items" className="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">Manage items →</Link>
        </Card>
      </div>
      <p className="mt-6 text-xs leading-5 text-slate-500">Your schedule is a proposal based on information you entered. You may freely adjust it. Consult a healthcare provider for recommendations or concerns.</p>
    </>
  );
}
