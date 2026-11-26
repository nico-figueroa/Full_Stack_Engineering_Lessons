import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import LabelMatchReview from "../components/LabelMatchReview.jsx";
import { useToast } from "../context/useToast.js";
import useLanguage from "../context/useLanguage.js";

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { showToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get(`/items/${itemId}`), api.get(`/reference/${itemId}`)])
      .then(([itemResult, referenceResult]) => {
        if (!active) return;
        if (itemResult.status === "fulfilled") setItem(itemResult.value.data);
        else throw itemResult.reason;
        if (referenceResult.status === "fulfilled") setReference(referenceResult.value.data.reference);
        else showToast("error", t("details.referenceUnavailable"));
      })
      .catch(error => showToast("error", error.response?.data?.error || t("details.loadError")))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast, reloadKey, t]);

  async function deleteItem() {
    try {
      await api.delete(`/items/${itemId}`);
      showToast("success", t("items.deleted"));
      navigate("/items");
    } catch (error) {
      showToast("error", error.response?.data?.error || t("items.deleteError"));
    }
  }

  const matchStatus = item?.reference_data?.match_status;
  const needsReview = matchStatus === "needs_review" || Boolean(reference?.reviewRequired);

  if (loading) return <p className="text-sm text-slate-500">{t("details.loading")}</p>;
  if (!item) return <Card><p>{t("details.notFound")}</p><Link to="/items" className="mt-3 inline-block text-violet-700 hover:underline">{t("details.returnItems")}</Link></Card>;

  return (
    <>
      <div className="mb-6"><Link to="/items" className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">{t("details.backItems")}</Link></div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">{t(`items.categoryOptions.${item.category}`)}</span><h1 className="mt-3 text-3xl font-semibold">{item.name}</h1><p className="mt-2 text-slate-500">{item.dosage_per_intake || t("items.doseUnspecified")} · {t(`items.frequencyOptions.${item.frequency}`)}</p></div>
        <div className="flex flex-wrap gap-2"><Link to={`/override/${item.id}`}><Button variant="secondary">{t("details.addOverride")}</Button></Link><Button variant="danger" onClick={() => setConfirmDelete(true)}>{t("details.delete")}</Button></div>
      </div>
      {needsReview && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
          <div className="max-w-2xl text-sm leading-6"><p className="font-semibold">⚠ {t("details.manualReview")}</p><p>{t("details.manualReviewBody")}</p></div>
          <Button onClick={() => setReviewOpen(true)}>{t("details.chooseLabel")}</Button>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t("details.routine")}>
          <dl className="grid grid-cols-2 gap-y-4 text-sm"><dt className="text-slate-500">{t("items.frequencyLabel")}</dt><dd className="capitalize">{t(`items.frequencyOptions.${item.frequency}`)}</dd><dt className="text-slate-500">{t("items.timesLabel")}</dt><dd className="capitalize">{(item.times_of_day || []).map(time => t(`items.timeOptions.${time}`)).join(", ") || t("items.timeOptions.morning")}</dd><dt className="text-slate-500">{t("items.container")}</dt><dd>{item.container_quantity ?? t("details.notSet")}</dd></dl>
          {item.notes && <p className="mt-5 border-t pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">{item.notes}</p>}
        </Card>
        <Card title={t("details.savedWarnings")}>
          {item.warnings?.length ? <ul className="space-y-2">{item.warnings.map((warning, index) => <li key={index} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{warning}</li>)}</ul> : <p className="text-sm text-slate-500">{t("details.noWarningsBody")}</p>}
          <p className="mt-4 text-sm"><Link to={`/interactions/${item.id}`} state={{ from: `/items/${item.id}` }} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("details.interactionInfo")}</Link></p>
        </Card>
        <Card title={t("details.interactionProfile")}>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.interaction_profile?.notes || t("details.noInteractionNotes")}</p>
          {item.interaction_profile?.food && <p className="mt-4 text-sm"><strong>{t("details.food")}:</strong> {item.interaction_profile.food}</p>}
        </Card>
        <Card title={t("reference.title")}>
          {reference?.references?.length ? <ul className="space-y-3">{reference.references.slice(0, 6).map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-violet-700 hover:underline dark:text-violet-300">{source.source}: {source.title} ↗</a></li>)}</ul> : <p className="text-sm text-slate-500">{t("details.noReference")}</p>}
          {matchStatus === "confirmed" && <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">✓ Label confirmed by you{item.reference_data?.match_title ? `: ${item.reference_data.match_title}` : ""}</p>}
          {matchStatus === "no_label" && <p className="mt-3 text-xs text-slate-500">{t("details.labelNone")}</p>}
          {!needsReview && <button type="button" onClick={() => setReviewOpen(true)} className="mt-3 block text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">{t("details.chooseDifferent")}</button>}
          {item.reference_data?.source_url && <a href={item.reference_data.source_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-violet-700 hover:underline">{t("details.savedReference")}</a>}
          <p className="mt-4 text-sm"><Link to={`/reference/${item.id}`} state={{ from: `/items/${item.id}` }} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("details.fullReference")}</Link></p>
          <p className="mt-4 text-xs leading-5 text-slate-500">{t("details.referenceDisclaimer")}</p>
        </Card>
      </div>
      {reviewOpen && <LabelMatchReview item={item} onClose={() => setReviewOpen(false)} onSaved={() => setReloadKey(key => key + 1)} />}
      <Modal open={confirmDelete} title={t("items.deleteTitle")} onClose={() => setConfirmDelete(false)}>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{t("items.deleteBodyPrefix")} <strong>{item.name}</strong> {t("items.removeBodySuffix")}</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button><Button variant="danger" onClick={deleteItem}>{t("items.delete")}</Button></div>
      </Modal>
    </>
  );
}
