import { useEffect, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button.jsx";
import Modal from "./ui/Modal.jsx";
import { useToast } from "../context/useToast.js";

const CONFIDENCE_STYLES = {
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  high: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
};

export default function LabelMatchReview({ item, open = true, onClose, onSaved }) {
  const [query, setQuery] = useState(item.name);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  async function search(term) {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/reference/${item.id}/candidates`, { params: { q: term } });
      setResult(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to search DailyMed right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.get(`/reference/${item.id}/candidates`, { params: { q: item.name } })
      .then(({ data }) => { if (active) setResult(data); })
      .catch(requestError => { if (active) setError(requestError.response?.data?.error || "Unable to search DailyMed right now."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item.id, item.name]);

  async function choose(body, message) {
    setSaving(true);
    try {
      const { data } = await api.put(`/reference/${item.id}/match`, body);
      showToast("success", message);
      onSaved?.(data.item);
      onClose();
    } catch (requestError) {
      showToast("error", requestError.response?.data?.error || "Unable to save your label selection.");
    } finally {
      setSaving(false);
    }
  }

  const currentSetid = result?.current?.setid || item.reference_data?.dailymed_setid;
  const busy = loading || saving;

  return (
    <Modal open={open} title="Select the matching official label" onClose={() => !saving && onClose()} className="max-w-3xl">
      <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        We could not confidently identify <strong>{item.name}</strong> in DailyMed. Compare the active ingredients and manufacturer printed on your package, then choose the label that matches it.
      </p>
      <form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); if (query.trim()) search(query.trim()); }}>
        <label className="sr-only" htmlFor="label-search">Search DailyMed</label>
        <input id="label-search" value={query} maxLength={160} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Brand, generic name, or active ingredient" />
        <Button type="submit" variant="secondary" disabled={busy}>Search</Button>
      </form>
      {loading && <p className="text-sm text-slate-500">Searching DailyMed…</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
      {!loading && result && (
        result.candidates.length ? (
          <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1" aria-label="Label candidates">
            {result.candidates.map(candidate => (
              <li key={candidate.setid} className={`rounded-xl border p-4 ${candidate.setid === currentSetid ? "border-violet-400 bg-violet-50/60 dark:bg-violet-950/40" : "border-slate-200 dark:border-slate-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold uppercase">{candidate.brand || candidate.title}</p>
                    {candidate.generic && <p className="text-sm text-slate-600 dark:text-slate-300">Active ingredients: <span className="capitalize">{candidate.generic}</span></p>}
                    <p className="text-xs text-slate-500">{[candidate.form, candidate.labeler].filter(Boolean).join(" · ")}</p>
                    {candidate.reasons?.length > 0 && <p className="mt-2 text-xs text-slate-500">{candidate.reasons.join(" · ")}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${CONFIDENCE_STYLES[candidate.confidence] || CONFIDENCE_STYLES.low}`}>{candidate.confidence} match</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button className="px-3 py-1.5 text-sm" disabled={busy} onClick={() => choose({ status: "confirmed", setid: candidate.setid, title: candidate.title }, "Label confirmed.")}>Use this label</Button>
                  <a href={candidate.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">Open on DailyMed ↗</a>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No plausible labels were found for “{result.query}”. Try the generic name or an active ingredient.</p>
      )}
      {result?.excludedCount > 0 && <p className="mt-3 text-xs text-slate-500">{result.excludedCount} unrelated label{result.excludedCount === 1 ? " was" : "s were"} hidden (for example cosmetics or name-only coincidences).</p>}
      <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button variant="secondary" disabled={busy} onClick={() => choose({ status: "auto" }, "Automatic matching restored.")}>Reset to automatic</Button>
        <Button variant="secondary" disabled={busy} onClick={() => choose({ status: "no_label" }, "Marked as having no official label.")}>No official label applies</Button>
      </div>
    </Modal>
  );
}
