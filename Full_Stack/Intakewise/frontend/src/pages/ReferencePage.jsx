import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card.jsx";
import { useToast } from "../context/useToast.js";

const sections = [
  ["contraindications", "Contraindications"],
  ["interactions", "Interactions"],
  ["foodInteractions", "Food interactions"],
  ["warnings", "Warnings"],
  ["pharmacology", "Pharmacology"],
];

export default function ReferencePage() {
  const { itemId } = useParams();
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    api.get(`/reference/${itemId}`)
      .then(({ data }) => { if (active) setReference(data.reference); })
      .catch(error => showToast("error", error.response?.data?.error || "Could not load reference information."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast]);

  const navLinks = (
    <nav aria-label="Reference navigation" className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
      <Link to={`/items/${itemId}`} className="text-violet-700 hover:underline dark:text-violet-300">← Back to item details</Link>
      <Link to={`/interactions/${itemId}`} state={{ from: `/reference/${itemId}` }} className="text-violet-700 hover:underline dark:text-violet-300">Interaction details</Link>
      <Link to="/items" className="text-slate-500 hover:underline">All items</Link>
    </nav>
  );

  if (loading) return <p className="text-sm text-slate-500">Loading reference information…</p>;
  if (!reference) return <div className="mx-auto max-w-4xl">{navLinks}<p className="text-sm text-slate-500">No reference information is available.</p></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {navLinks}
      <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">OFFICIAL REFERENCES</p><h1 className="mt-2 text-3xl font-semibold">Reference information</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{reference.notice}</p></div>
      {reference.reviewRequired && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
        <p className="font-semibold">⚠ Requires manual review</p>
        <p className="mt-1 leading-6">{reference.match?.candidateCount ? `${reference.match.candidateCount} possible labels were found` : "No reliable label was found"}. Official label details are withheld until you confirm the correct product.</p>
        <Link to={`/items/${itemId}`} className="mt-3 inline-block font-semibold text-amber-800 underline dark:text-amber-200">Review the label match on the item page →</Link>
      </div>}
      {reference.match?.setid && <Card title="Matched label">
        <p className="text-sm font-semibold">{reference.match.title}</p>
        <p className="mt-1 text-xs text-slate-500">DailyMed · {reference.match.status === "confirmed" ? "confirmed by you" : `match confidence: ${reference.match.confidence}`}{reference.match.reasons?.length ? ` (${reference.match.reasons.join(", ")})` : ""}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">If this is not your product, <Link to={`/items/${itemId}`} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">choose a different label</Link> or add its active ingredients, manufacturer, or NDC to the item.</p>
      </Card>}
      <Card title="Sources">
        {reference.references?.length ? <ul className="space-y-2">{reference.references.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{source.source} · {source.title} ↗</a></li>)}</ul> : <p className="text-sm text-slate-500">No matching source material was found for this item.</p>}
        {reference.sourceErrors?.length > 0 && <ul className="mt-4 space-y-2 text-sm text-amber-700 dark:text-amber-300">{reference.sourceErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">{sections.map(([key, title]) => <Card key={key} title={title}>
        {reference[key]?.length ? <ul className="max-h-80 space-y-3 overflow-y-auto text-sm leading-6 text-slate-700 dark:text-slate-300">{reference[key].map((text, index) => <li key={index}>{text}</li>)}</ul> : <p className="text-sm text-slate-500">No information available from the retrieved labels.</p>}
      </Card>)}</div>
      <Card title="Your saved information">
        {reference.userProvided?.interactionProfile?.notes && <p className="mb-3 text-sm"><strong>Interaction notes:</strong> {reference.userProvided.interactionProfile.notes}</p>}
        {reference.userProvided?.interactionProfile?.food && <p className="mb-3 text-sm"><strong>Food notes:</strong> {reference.userProvided.interactionProfile.food}</p>}
        {reference.userProvided?.warnings?.length ? reference.userProvided.warnings.map((warning, index) => <p key={index} className="mb-2 text-sm">{warning}</p>) : <p className="text-sm text-slate-500">No saved user warnings.</p>}
      </Card>
      <p className="text-xs leading-5 text-slate-500">This information is presented directly from referenced public sources where available. It is for informational purposes only, not medical advice. Consult the source label and your healthcare provider.</p>
    </div>
  );
}
