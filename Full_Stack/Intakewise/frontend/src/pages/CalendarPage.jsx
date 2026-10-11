import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { addDays, endOfMonth, endOfWeek, format, getDay, parse, startOfMonth, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import api from "../api/client";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Modal from "../components/ui/Modal.jsx";
import { useToast } from "../context/useToast.js";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: date => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});
const viewNames = ["month", "week", "day", "agenda"];
const asDate = (day, time) => {
  const normalized = /^\d{1,2}:\d{2}$/.test(time || "") ? time : ({ morning: "08:00", noon: "12:00", afternoon: "14:00", evening: "18:00", bedtime: "21:00", night: "21:00" }[time] || "08:00");
  return new Date(`${day}T${normalized.length === 4 ? `0${normalized}` : normalized}:00`);
};

function dateRange(date, view) {
  if (view === "month") return [startOfWeek(startOfMonth(date)), endOfWeek(endOfMonth(date))];
  if (view === "week") return [startOfWeek(date), endOfWeek(date)];
  return view === "agenda" ? [date, addDays(date, 30)] : [date, date];
}

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState("week");
  const [events, setEvents] = useState([]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => (searchParams.get("new") ? { mode: "new" } : null));
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState(() => ({ item_id: "", date: format(new Date(), "yyyy-MM-dd"), time: "08:00", dosage: "", notes: "" }));
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const [from, to] = useMemo(() => dateRange(date, view), [date, view]);

  const fetchCalendarData = useCallback(async () => {
    const fromString = format(from, "yyyy-MM-dd");
    const toString = format(to, "yyyy-MM-dd");
    const [scheduleResponse, itemResponse] = await Promise.all([
      api.get("/schedule", { params: { from: fromString, to: toString } }),
      api.get("/items"),
    ]);
    return {
      items: itemResponse.data,
      events: scheduleResponse.data.schedule.map((entry, index) => ({
        id: entry.override_id || `${entry.item_id}-${entry.date}-${entry.time}-${index}`,
        title: `${entry.name}${entry.dosage ? ` · ${entry.dosage}` : ""}`,
        start: asDate(entry.date, entry.time),
        end: new Date(asDate(entry.date, entry.time).getTime() + 30 * 60 * 1000),
        resource: entry,
      })),
    };
  }, [from, to]);

  const load = useCallback(async () => {
    try {
      const data = await fetchCalendarData();
      setItems(data.items);
      setEvents(data.events);
    } catch (error) {
      showToast("error", error.response?.data?.error || "Could not load the calendar.");
    }
  }, [fetchCalendarData, showToast]);

  useEffect(() => {
    let active = true;
    fetchCalendarData()
      .then(data => {
        if (active) {
          setItems(data.items);
          setEvents(data.events);
          const first = data.items[0];
          if (first) {
            setForm(previous => (previous.item_id ? previous : {
              ...previous,
              item_id: String(first.id),
              dosage: previous.dosage || first.dosage_per_intake || "",
            }));
          }
        }
      })
      .catch(error => {
        if (active) showToast("error", error.response?.data?.error || "Could not load the calendar.");
      });
    return () => { active = false; };
  }, [fetchCalendarData, showToast]);

  useEffect(() => {
    if (searchParams.has("new")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  function openNew(dateValue = new Date()) {
    const item = items[0];
    const selectedTime = format(dateValue, "HH:mm");
    setSelected({ mode: "new" });
    setForm({
      item_id: item ? String(item.id) : "",
      date: format(dateValue, "yyyy-MM-dd"),
      time: selectedTime === "00:00" ? "08:00" : selectedTime,
      dosage: item?.dosage_per_intake || "",
      notes: "",
    });
  }

  function openEvent(event) {
    const entry = event.resource;
    setSelected({ mode: "existing", event });
    setForm({
      item_id: String(entry.item_id),
      date: entry.date,
      time: /^\d{1,2}:\d{2}$/.test(entry.time) ? entry.time : format(event.start, "HH:mm"),
      dosage: entry.dosage || "",
      notes: entry.notes || "",
    });
  }

  async function saveEvent(event) {
    event.preventDefault();
    if (!form.item_id || !form.date || !form.time) {
      showToast("error", "Choose an item, date, and time.");
      return;
    }
    setBusy(true);
    const payload = { ...form, item_id: Number(form.item_id), is_skipped: false };
    try {
      if (selected.mode === "new") await api.post("/overrides", payload);
      else {
        const current = selected.event.resource;
        if (current.override_id) await api.put(`/overrides/${current.override_id}`, payload);
        else await api.post("/overrides", payload);
      }
      setSelected(null);
      await load();
      showToast("success", "Calendar change saved.");
    } catch (error) {
      showToast("error", error.response?.data?.error || "Could not save this calendar change.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent() {
    const entry = selected.event.resource;
    setBusy(true);
    try {
      if (entry.override_id) await api.delete(`/overrides/${entry.override_id}`);
      else await api.post("/overrides", {
        item_id: entry.item_id,
        date: entry.date,
        time: entry.time,
        dosage: null,
        notes: "Skipped from calendar",
        is_skipped: true,
      });
      setSelected(null);
      setDeleteConfirm(false);
      await load();
      showToast("success", entry.override_id ? "Override removed." : "Scheduled intake skipped.");
    } catch (error) {
      showToast("error", error.response?.data?.error || "Could not remove this calendar event.");
    } finally {
      setBusy(false);
    }
  }

  const eventStyleGetter = event => {
    const { source, warning } = event.resource;
    return {
      className: `intake-calendar-event ${warning ? "intake-warning" : source === "override" ? "intake-override" : "intake-proposal"}`,
    };
  };
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">PLAN AHEAD</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Your calendar</h1><p className="mt-2 text-sm text-slate-500">Select a date range to add an intake or click a proposal to adjust it.</p></div>
        <Button onClick={() => openNew()}>＋ Add intake</Button>
      </div>
      <Card className="calendar-card p-3 sm:p-5">
        {items.length === 0 && <p className="px-3 pb-3 text-sm text-slate-500">Add an item before creating calendar intakes.</p>}
        <div className="h-[68vh] min-h-[540px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            date={date}
            view={view}
            views={viewNames}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={openEvent}
            onSelectSlot={({ start }) => openNew(start)}
            selectable
            popup
            eventPropGetter={eventStyleGetter}
            messages={{ noEventsInRange: "No scheduled intakes in this range.", showMore: total => `+${total} more` }}
          />
        </div>
      </Card>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />Proposed</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />Adjusted</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Has saved warning</span></div>
      <p className="mt-4 text-xs leading-5 text-slate-500">This schedule is a proposal based on your entries. You can freely adjust it. Consult your healthcare provider for official recommendations. Warnings do not establish that an intake combination is unsafe or safe.</p>
      <Modal open={Boolean(selected) && !deleteConfirm} title={selected?.mode === "new" ? "Add calendar intake" : "Calendar event"} onClose={() => setSelected(null)}>
        {selected?.mode === "existing" && <div className="mb-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"><p className="font-semibold">{selected.event.resource.name}</p><p className="mt-1 text-slate-500">{selected.event.resource.date} · {selected.event.resource.time} · {selected.event.resource.source === "override" ? "User override" : "Schedule proposal"}</p>{selected.event.resource.notes && <p className="mt-2 text-slate-600">{selected.event.resource.notes}</p>}</div>}
        <form onSubmit={saveEvent}>
          <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Item
            <select required value={form.item_id} onChange={event => setForm({ ...form, item_id: event.target.value, dosage: items.find(item => String(item.id) === event.target.value)?.dosage_per_intake || "" })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
              <option value="">Select an item</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="grid gap-1 sm:grid-cols-2"><Input label="Date" type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /><Input label="Time" type="time" required value={form.time} onChange={event => setForm({ ...form, time: event.target.value })} /></div>
          <Input label="Dosage" value={form.dosage} onChange={event => setForm({ ...form, dosage: event.target.value })} />
          <label className="mb-5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes
            <textarea rows="2" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <div className="flex justify-between gap-2">
            {selected?.mode === "existing" ? <Button type="button" variant="danger" onClick={() => setDeleteConfirm(true)} disabled={busy}>Delete / skip</Button> : <span />}
            <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cancel</Button><Button type="submit" disabled={busy || !items.length}>{busy ? "Saving…" : "Save intake"}</Button></div>
          </div>
        </form>
      </Modal>
      <Modal open={deleteConfirm} title={selected?.event?.resource?.override_id ? "Remove this override?" : "Skip this intake?"} onClose={() => setDeleteConfirm(false)}>
        <p className="mb-6 text-sm leading-6 text-slate-600 dark:text-slate-300">{selected?.event?.resource?.override_id ? "Removing this override restores the original proposal." : "This hides the proposed event for this date only."}</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button><Button variant="danger" onClick={removeEvent} disabled={busy}>{busy ? "Saving…" : "Confirm"}</Button></div>
      </Modal>
    </>
  );
}
