import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card.jsx";
import { useToast } from "../context/useToast.js";

export default function InteractionDetail() {
  const { itemId } = useParams();
  const location = useLocation();
  const [interaction, setInteraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    api.get("/interactions")
      .then(({ data }) => {
        if (active) setInteraction(data.interactions.find(value => String(value.item_id) === itemId) || null);
      })
      .catch(error => showToast("error", error.response?.data?.error || "Could not load interaction information."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast]);

  const backTarget = location.state?.from === "/" ? { to: "/", label: "← Back to dashboard" } : { to: `/items/${itemId}`, label: "← Back to item details" };
  const navLinks = (
    <nav aria-label="Interaction navigation" className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
      <Link to={backTarget.to} className="text-violet-700 hover:underline dark:text-violet-300">{backTarget.label}</Link>
      {backTarget.to === "/" && <Link to={`/items/${itemId}`} className="text-violet-700 hover:underline dark:text-violet-300">Item details</Link>}
      <Link to={`/reference/${itemId}`} state={{ from: `/interactions/${itemId}` }} className="text-violet-700 hover:underline dark:text-violet-300">Official reference</Link>
      <Link to="/items" className="text-slate-500 hover:underline">All items</Link>
    </nav>
  );

  if (loading) return <p className="text-sm text-slate-500">Loading interaction information…</p>;
  if (!interaction) return <div className="mx-auto max-w-3xl">{navLinks}<Card><p>No interaction information was returned for this item.</p></Card></div>;

  return (
    <div className="mx-auto max-w-3xl">
      {navLinks}
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">SAFETY INFORMATION</p>
      <h1 className="mt-2 text-3xl font-semibold">{interaction.name} interactions</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Information is provided for review only. It may be incomplete and is not medical advice.</p>
      <Card className="mt-6">
        {interaction.warnings.length === 0 ? <p className="text-sm text-slate-500">No interaction warnings were returned by the connected source. This does not mean that no interactions exist.</p> :
          <ul className="space-y-3">{interaction.warnings.map((warning, index) => <li key={`${warning.source}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="text-sm leading-6 text-amber-950 dark:text-amber-100">{warning.description}</p><div className="mt-3 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300"><span>{warning.source}</span>{warning.sourceUrl && <a href={warning.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">View source ↗</a>}</div></li>)}</ul>}
      </Card>
      <Card title="Important">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Do not start, stop, or change a medication based on this page. Ask a pharmacist or qualified healthcare professional to review your complete medication and supplement list.</p>
      </Card>
    </div>
  );
}
