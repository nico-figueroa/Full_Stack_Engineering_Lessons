import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Modal from "../components/ui/Modal.jsx";
import { useToast } from "../context/useToast.js";
import useLanguage from "../context/useLanguage.js";

const emptyItem = {
  name: "", category: "medication", dosage_per_intake: "", frequency: "daily",
  times_of_day: ["morning"], container_quantity: "", notes: "",
  interaction_profile: {}, reference_data: {}, warnings: [],
};

const FREQUENCY_OPTIONS = [
  ["daily", "Daily"],
  ["weekly", "Weekly (Monday)"],
  ["weekdays", "Weekdays"],
  ["every:2days", "Every 2 days"],
  ["every:3days", "Every 3 days"],
  ["as_needed", "As needed"],
];
const FREQUENCY_LABELS = Object.fromEntries(FREQUENCY_OPTIONS);

function doseCount(dosage) {
  const match = /^\s*(\d+(?:\.\d+)?)/.exec(dosage || "");
  return match ? Number(match[1]) : null;
}

export function ItemForm({ initial, onSave, busy }) {
  const { t } = useLanguage();
  const [item, setItem] = useState({ ...emptyItem, ...initial });
  const [interactionNotes, setInteractionNotes] = useState(initial?.interaction_profile?.notes || "");
  const [foodNotes, setFoodNotes] = useState(initial?.interaction_profile?.food || "");
  const [referenceUrl, setReferenceUrl] = useState(initial?.reference_data?.source_url || "");
  const [referenceSummary, setReferenceSummary] = useState(initial?.reference_data?.summary || "");
  const initialIngredients = initial?.reference_data?.active_ingredients;
  const [identifiers, setIdentifiers] = useState({
    active_ingredients: Array.isArray(initialIngredients) ? initialIngredients.join(", ") : initialIngredients || "",
    manufacturer: initial?.reference_data?.manufacturer || "",
    ndc: initial?.reference_data?.ndc || "",
    dosage_form: initial?.reference_data?.dosage_form || "",
    strength: initial?.reference_data?.strength || "",
  });
  const updateIdentifier = (key, value) => setIdentifiers(previous => ({ ...previous, [key]: value }));
  const [warnings, setWarnings] = useState((initial?.warnings || []).join("\n"));
  const [formError, setFormError] = useState("");
  const times = ["morning", "noon", "afternoon", "evening", "bedtime"];
  const update = (key, value) => {
    setFormError("");
    setItem(previous => ({ ...previous, [key]: value }));
  };
  const maxTimes = doseCount(item.dosage_per_intake);

  function buildReferenceData() {
    const data = { ...(initial?.reference_data || {}), source_url: referenceUrl.trim(), summary: referenceSummary.trim() };
    const ingredients = identifiers.active_ingredients.split(/[,;]/).map(value => value.trim()).filter(Boolean);
    data.active_ingredients = ingredients;
    for (const key of ["manufacturer", "ndc", "dosage_form", "strength"]) data[key] = identifiers[key].trim();
    const original = initial?.reference_data || {};
    const originalIngredients = Array.isArray(original.active_ingredients) ? original.active_ingredients.join(",") : original.active_ingredients || "";
    const identityChanged = initial?.id && (
      item.name.trim().toLowerCase() !== (initial.name || "").trim().toLowerCase()
      || ingredients.join(",") !== originalIngredients
      || ["manufacturer", "ndc", "dosage_form", "strength"].some(key => data[key] !== (original[key] || ""))
    );
    if (identityChanged && data.match_status !== "no_label") {
      delete data.match_status;
      delete data.dailymed_setid;
      delete data.match_title;
    }
    return data;
  }

  function submit(event) {
    event.preventDefault();
    if (item.frequency !== "as_needed" && item.times_of_day.length === 0) {
      setFormError(t("items.selectTime"));
      return;
    }
    if (maxTimes !== null && item.times_of_day.length > maxTimes) {
      setFormError(t("items.tooManyTimes", { selected: item.times_of_day.length, maximum: maxTimes }));
      return;
    }
    onSave({
      ...item,
      container_quantity: item.container_quantity === "" ? null : Number(item.container_quantity),
      interaction_profile: { notes: interactionNotes.trim(), food: foodNotes.trim() },
      reference_data: buildReferenceData(),
      warnings: warnings.split("\n").map(value => value.trim()).filter(Boolean),
    });
  }

  return (
    <form onSubmit={submit}>
      <Input label={t("items.itemName")} required maxLength={160} value={item.name} onChange={event => update("name", event.target.value)} placeholder={t("items.namePlaceholder")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.category")}
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" value={item.category} onChange={event => update("category", event.target.value)}>
            {["medication", "supplement", "vitamin", "custom", "alcohol", "nicotine", "cannabis", "other"].map(value => <option key={value} value={value}>{t(`items.categoryOptions.${value}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.frequencyLabel")}
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950" value={item.frequency} onChange={event => update("frequency", event.target.value)}>
            {FREQUENCY_OPTIONS.map(([value]) => <option key={value} value={value}>{t(`items.frequencyOptions.${value}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        <Input label={t("items.dosage")} maxLength={160} value={item.dosage_per_intake || ""} onChange={event => update("dosage_per_intake", event.target.value)} placeholder={t("items.dosagePlaceholder")} />
        <Input label={t("items.container")} type="number" min="0" step="1" value={item.container_quantity ?? ""} onChange={event => update("container_quantity", event.target.value)} placeholder={t("items.containerPlaceholder")} />
      </div>
      <fieldset className="mb-5">
        <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.times")}</legend>
        <p id="times-of-day-help" className="mb-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t("items.multiple")}{maxTimes !== null ? ` (${t("items.currently")} ${maxTimes})` : ""}.
          {item.frequency === "as_needed" ? ` ${t("items.asNeededHelp")}` : ""}
        </p>
        <div className="flex flex-wrap gap-2" aria-describedby="times-of-day-help">
          {times.map(time => <label key={time} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm capitalize ${item.times_of_day.includes(time) ? "border-violet-400 bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "border-slate-200 dark:border-slate-700"}`}>
            <input type="checkbox" className="sr-only" checked={item.times_of_day.includes(time)} onChange={() => update("times_of_day", item.times_of_day.includes(time) ? item.times_of_day.filter(value => value !== time) : [...item.times_of_day, time])} />{t(`items.timeOptions.${time}`)}
          </label>)}
        </div>
      </fieldset>
      <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.notes")}
        <textarea rows="2" maxLength={1000} value={interactionNotes} onChange={event => setInteractionNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder={t("items.notesPlaceholder")} />
      </label>
      <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.foodNotes")}
        <textarea rows="2" maxLength={1000} value={foodNotes} onChange={event => setFoodNotes(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="mb-4 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.warnings")}
        <textarea rows="2" maxLength={2000} value={warnings} onChange={event => setWarnings(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder={t("items.warningsPlaceholder")} />
      </label>
      <fieldset className="mb-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">{t("items.identifiers")}</legend>
        <p className="mb-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("items.identifiersHelp")}</p>
        <Input label={t("items.activeIngredients")} maxLength={500} value={identifiers.active_ingredients} onChange={event => updateIdentifier("active_ingredients", event.target.value)} placeholder={t("items.ingredientsPlaceholder")} />
        <div className="grid gap-1 sm:grid-cols-2">
          <Input label={t("items.manufacturer")} maxLength={160} value={identifiers.manufacturer} onChange={event => updateIdentifier("manufacturer", event.target.value)} placeholder={t("items.manufacturerPlaceholder")} />
          <Input label={t("items.ndcCode")} maxLength={20} value={identifiers.ndc} onChange={event => updateIdentifier("ndc", event.target.value)} placeholder={t("items.ndcPlaceholder")} />
          <Input label={t("items.dosageForm")} maxLength={80} value={identifiers.dosage_form} onChange={event => updateIdentifier("dosage_form", event.target.value)} placeholder={t("items.formPlaceholder")} />
          <Input label={t("items.strength")} maxLength={80} value={identifiers.strength} onChange={event => updateIdentifier("strength", event.target.value)} placeholder={t("items.strengthPlaceholder")} />
        </div>
      </fieldset>
      <div className="grid gap-1 sm:grid-cols-2">
        <Input label={t("items.reference")} type="url" value={referenceUrl} onChange={event => setReferenceUrl(event.target.value)} placeholder="https://…" />
        <Input label={t("items.referenceSummary")} maxLength={1000} value={referenceSummary} onChange={event => setReferenceSummary(event.target.value)} />
      </div>
      <label className="mb-5 block text-sm text-slate-600 dark:text-slate-400">{t("items.generalNotes")}
        <textarea rows="2" maxLength={2000} value={item.notes || ""} onChange={event => update("notes", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
      </label>
      {formError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{formError}</p>}
      <div className="flex justify-end gap-2"><Button type="submit" disabled={busy}>{busy ? t("items.saving") : t("items.save")}</Button></div>
    </form>
  );
}

export default function ItemsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(() => (searchParams.get("new") ? {} : null));
  const closeEditor = () => {
    setEditing(null);
    if (searchParams.has("new")) setSearchParams({}, { replace: true });
  };
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function loadItems() {
    const { data } = await api.get("/items");
    setItems(data);
  }
  useEffect(() => {
    let active = true;
    api.get("/items")
      .then(({ data }) => {
        if (active) setItems(data);
      })
      .catch(error => {
        if (active) showToast("error", error.response?.data?.error || t("items.loadError"));
      });
    return () => { active = false; };
  }, [showToast, t]);

  async function saveItem(value) {
    setBusy(true);
    try {
      if (editing?.id) await api.put(`/items/${editing.id}`, value);
      else await api.post("/items", value);
      await loadItems();
      closeEditor();
      showToast("success", editing?.id ? t("items.updated") : t("items.added"));
    } catch (error) {
      showToast("error", error.response?.data?.error || t("items.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    try {
      await api.delete(`/items/${deleting.id}`);
      setItems(values => values.filter(item => item.id !== deleting.id));
      setDeleting(null);
      showToast("success", t("items.deleted"));
    } catch (error) {
      showToast("error", error.response?.data?.error || t("items.deleteError"));
    }
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">{t("items.catalog")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("items.title")}</h1><p className="mt-2 text-slate-500">{t("items.subtitle")}</p></div>
        <Button onClick={() => setEditing({})}>{t("items.add")}</Button>
      </div>
      {items.length === 0 ? <Card><div className="py-12 text-center"><p className="text-lg font-medium">{t("items.emptyTitle")}</p><p className="mt-2 text-sm text-slate-500">{t("items.emptyBody")}</p><Button className="mt-5" onClick={() => setEditing({})}>{t("items.addFirst")}</Button></div></Card> :
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item => (
          <Card key={item.id} className="mb-0">
            <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">{t(`items.categoryOptions.${item.category}`)}</span><h2 className="mt-3 text-lg font-semibold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.dosage_per_intake || t("items.doseUnspecified")} · {FREQUENCY_LABELS[item.frequency] ? t(`items.frequencyOptions.${item.frequency}`) : item.frequency}</p></div><span aria-label={t("items.warningCount", { count: item.warnings?.length || 0 })} className="text-xs text-amber-600">{item.warnings?.length ? `⚠ ${item.warnings.length}` : ""}</span></div>
            {item.reference_data?.match_status === "needs_review" && (
              <Link to={`/items/${item.id}`} role="alert" aria-label={`${item.name} requires manual review of its official label match`} className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                <span aria-hidden="true">⚠</span><span>{t("items.manualReview")}</span>
              </Link>
            )}
            {item.reference_data?.match_status === "confirmed" && <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ {t("details.labelConfirmed")}</p>}
            <p className="mt-4 text-sm text-slate-500">{t("items.timesLabel")}: {(item.times_of_day || []).map(time => t(`items.timeOptions.${time}`)).join(", ") || t(item.frequency === "as_needed" ? "items.frequencyOptions.as_needed" : "items.timeOptions.morning")}</p>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link to={`/items/${item.id}`} className="mr-auto self-center text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("items.viewDetails")}</Link>
              <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setEditing(item)}>{t("items.edit")}</Button>
              <Button variant="danger" className="px-3 py-1.5 text-sm" onClick={() => setDeleting(item)}>{t("items.delete")}</Button>
            </div>
          </Card>
        ))}</div>}
      <Modal open={editing !== null} title={editing?.id ? t("items.edit") : t("items.add")} onClose={() => !busy && closeEditor()} className="max-w-2xl">
        {editing !== null && <ItemForm key={editing.id || "new"} initial={editing} onSave={saveItem} busy={busy} />}
      </Modal>
      <Modal open={Boolean(deleting)} title={t("items.removeTitle")} onClose={() => setDeleting(null)}>
        <p className="mb-6 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("items.removeBodyPrefix")} <strong>{deleting?.name}</strong> {t("items.removeBodySuffix")}</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)}>{t("common.cancel")}</Button><Button variant="danger" onClick={deleteItem}>{t("items.delete")}</Button></div>
      </Modal>
    </>
  );
}
