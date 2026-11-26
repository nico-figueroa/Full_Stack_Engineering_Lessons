import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card.jsx";
import { useToast } from "../context/useToast.js";
import useLanguage from "../context/useLanguage.js";

export default function InteractionDetail() {
  const { itemId } = useParams();
  const location = useLocation();
  const [interaction, setInteraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;
    api.get("/interactions")
      .then(({ data }) => {
        if (active) setInteraction(data.interactions.find(value => String(value.item_id) === itemId) || null);
      })
      .catch(error => showToast("error", error.response?.data?.error || t("interactions.loadError")))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast, t]);

  const backTarget = location.state?.from === "/" ? { to: "/", label: t("interactions.backDashboard") } : { to: `/items/${itemId}`, label: t("interactions.backItem") };
  const navLinks = (
    <nav aria-label={t("interactions.nav")} className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
      <Link to={backTarget.to} className="text-violet-700 hover:underline dark:text-violet-300">{backTarget.label}</Link>
      {backTarget.to === "/" && <Link to={`/items/${itemId}`} className="text-violet-700 hover:underline dark:text-violet-300">{t("interactions.itemDetails")}</Link>}
      <Link to={`/reference/${itemId}`} state={{ from: `/interactions/${itemId}` }} className="text-violet-700 hover:underline dark:text-violet-300">{t("interactions.official")}</Link>
      <Link to="/items" className="text-slate-500 hover:underline">{t("interactions.allItems")}</Link>
    </nav>
  );

  if (loading) return <p className="text-sm text-slate-500">{t("interactions.loading")}</p>;
  if (!interaction) return <div className="mx-auto max-w-3xl">{navLinks}<Card><p>{t("interactions.noneReturned")}</p></Card></div>;

  return (
    <div className="mx-auto max-w-3xl">
      {navLinks}
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">{t("interactions.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold">{t("interactions.title", { name: interaction.name })}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t("interactions.subtitle")}</p>
      <Card className="mt-6">
        {interaction.warnings.length === 0 ? <p className="text-sm text-slate-500">{t("interactions.noWarnings")}</p> :
          <ul className="space-y-3">{interaction.warnings.map((warning, index) => <li key={`${warning.source}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="text-sm leading-6 text-amber-950 dark:text-amber-100">{warning.description}</p><div className="mt-3 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300"><span>{warning.source}</span>{warning.sourceUrl && <a href={warning.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{t("interactions.source")}</a>}</div></li>)}</ul>}
      </Card>
      {interaction.evidence?.length > 0 && <Card title={t("interactions.evidence")}><p className="mb-4 text-sm text-slate-500">{t("interactions.evidenceBody")}</p><ul className="space-y-2">{interaction.evidence.map((reference, index) => <li key={`${reference.url}-${index}`}><a href={reference.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{reference.source} · {reference.title} ↗</a></li>)}</ul></Card>}
      {interaction.sourceErrors?.length > 0 && <Card><ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">{interaction.sourceErrors.map((error, index) => <li key={index}>{error}</li>)}</ul></Card>}
      <Card title={t("interactions.important")}>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("interactions.importantBody")}</p>
      </Card>
    </div>
  );
}
