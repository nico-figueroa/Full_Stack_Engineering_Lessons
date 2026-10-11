import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../context/useToast.js";

export default function OverrideEditor() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/overrides", { item_id: Number(itemId), date, time, dosage, notes });
      showToast("success", "Schedule override saved.");
      navigate("/calendar");
    } catch (error) {
      showToast("error", error.response?.data?.error || "Unable to save this override.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-3xl font-semibold">Add a schedule override</h1>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <Input label="Date" type="date" required value={date} onChange={event => setDate(event.target.value)} />
        <Input label="Time" type="time" required value={time} onChange={event => setTime(event.target.value)} />
        <Input label="Dosage" value={dosage} onChange={event => setDosage(event.target.value)} />
        <label className="mb-5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes
          <textarea rows="3" maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save override"}</Button>
      </form>
    </div>
  );
}
