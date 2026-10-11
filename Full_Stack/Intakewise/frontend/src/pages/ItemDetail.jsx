import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import LabelMatchReview from "../components/LabelMatchReview.jsx";
import { useToast } from "../context/useToast.js";

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

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get(`/items/${itemId}`), api.get(`/reference/${itemId}`)])
      .then(([itemResult, referenceResult]) => {
        if (!active) return;
        if (itemResult.status === "fulfilled") setItem(itemResult.value.data);
        else throw itemResult.reason;
        if (referenceResult.status === "fulfilled") setReference(referenceResult.value.data.reference);
        else showToast("error", "Item details loaded, but official reference data is temporarily unavailable.");
      })
      .catch(error => showToast("error", error.response?.data?.error || "Unable to load item details."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast, reloadKey]);

  async function deleteItem() {
    try {
      await api.delete(`/items/${itemId}`);
      showToast("success", "Item removed.");
      navigate("/items");
    } catch (error) {
      showToast("error", error.response?.data?.error || "Unable to delete this item.");
    }
  }

  const matchStatus = item?.reference_data?.match_status;
  const needsReview = matchStatus === "needs_review" || Boolean(reference?.reviewRequired);

  if (loading) return <p className="text-sm text-slate-500">Loading item details…</p>;
  if (!item) return <Card><p>We could not find this item in your account.</p><Link to="/items" className="mt-3 inline-block text-violet-700 hover:underline">Return to items</Link></Card>;

  return (
    <>
      <div className="mb-6"><Link to="/items" className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">← My items</Link></div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium capitalize text-violet-700 dark:bg-violet-950 dark:text-violet-300">{item.category}</span><h1 className="mt-3 text-3xl font-semibold">{item.name}</h1><p className="mt-2 text-slate-500">{item.dosage_per_intake || "Dosage not specified"} · {item.frequency}</p></div>
        <div className="flex flex-wrap gap-2"><Link to={`/override/${item.id}`}><Button variant="secondary">＋ Add override</Button></Link><Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete item</Button></div>
      </div>
      {needsReview && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
          <div className="max-w-2xl text-sm leading-6"><p className="font-semibold">⚠ Requires manual review</p><p>We found several possible official labels for this item, or not enough detail to pick one safely. Official label details are withheld until you confirm the correct label, so you never see information for the wrong product.</p></div>
          <Button onClick={() => setReviewOpen(true)}>Choose the correct label</Button>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Routine">
          <dl className="grid grid-cols-2 gap-y-4 text-sm"><dt className="text-slate-500">Frequency</dt><dd className="capitalize">{item.frequency}</dd><dt className="text-slate-500">Times</dt><dd className="capitalize">{(item.times_of_day || []).join(", ") || "Morning"}</dd><dt className="text-slate-500">Container quantity</dt><dd>{item.container_quantity ?? "Not set"}</dd></dl>
          {item.notes && <p className="mt-5 border-t pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">{item.notes}</p>}
        </Card>
        <Card title="Saved warnings">
          {item.warnings?.length ? <ul className="space-y-2">{item.warnings.map((warning, index) => <li key={index} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{warning}</li>)}</ul> : <p className="text-sm text-slate-500">No user-entered warnings. Missing warnings do not confirm that an item is risk-free.</p>}
          <p className="mt-4 text-sm"><Link to={`/interactions/${item.id}`} state={{ from: `/items/${item.id}` }} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">Review interaction information →</Link></p>
        </Card>
        <Card title="Interaction profile">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.interaction_profile?.notes || "No interaction profile notes have been entered."}</p>
          {item.interaction_profile?.food && <p className="mt-4 text-sm"><strong>Food:</strong> {item.interaction_profile.food}</p>}
        </Card>
        <Card title="Reference information">
          {reference?.references?.length ? <ul className="space-y-3">{reference.references.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="font-medium text-violet-700 hover:underline dark:text-violet-300">{source.source}: {source.title} ↗</a></li>)}</ul> : <p className="text-sm text-slate-500">No matching official label was found in the connected sources.</p>}
          {matchStatus === "confirmed" && <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">✓ Label confirmed by you{item.reference_data?.match_title ? `: ${item.reference_data.match_title}` : ""}</p>}
          {matchStatus === "no_label" && <p className="mt-3 text-xs text-slate-500">Marked by you as having no official label.</p>}
          {!needsReview && <button type="button" onClick={() => setReviewOpen(true)} className="mt-3 block text-sm font-medium text-violet-700 hover:underline dark:text-violet-300">Wrong label? Choose a different one</button>}
          {item.reference_data?.source_url && <a href={item.reference_data.source_url} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-violet-700 hover:underline">Saved reference ↗</a>}
          <p className="mt-4 text-sm"><Link to={`/reference/${item.id}`} state={{ from: `/items/${item.id}` }} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">View full reference profile →</Link></p>
          <p className="mt-4 text-xs leading-5 text-slate-500">Official information may be incomplete or unavailable. Always consult the source label and a healthcare professional.</p>
        </Card>
      </div>
      {reviewOpen && <LabelMatchReview item={item} onClose={() => setReviewOpen(false)} onSaved={() => setReloadKey(key => key + 1)} />}
      <Modal open={confirmDelete} title="Delete this item?" onClose={() => setConfirmDelete(false)}>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">This will remove <strong>{item.name}</strong> and its saved schedule overrides.</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" onClick={deleteItem}>Delete item</Button></div>
      </Modal>
    </>
  );
}
