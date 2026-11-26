import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import Card from "../components/ui/Card.jsx";
import { useToast } from "../context/useToast.js";
import useLanguage from "../context/useLanguage.js";

const sections = ["contraindications", "interactions", "foodInteractions", "warnings", "pharmacology"];

export default function ReferencePage() {
  const { itemId } = useParams();
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    let active = true;
    api.get(`/reference/${itemId}`)
      .then(({ data }) => { if (active) setReference(data.reference); })
      .catch(error => showToast("error", error.response?.data?.error || t("reference.error")))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [itemId, showToast, t]);

  const navLinks = (
    <nav aria-label={t("reference.nav")} className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
      <Link to={`/items/${itemId}`} className="text-violet-700 hover:underline dark:text-violet-300">{t("reference.backDetails")}</Link>
      <Link to={`/interactions/${itemId}`} state={{ from: `/reference/${itemId}` }} className="text-violet-700 hover:underline dark:text-violet-300">{t("reference.interactions")}</Link>
      <Link to="/items" className="text-slate-500 hover:underline">{t("reference.allItems")}</Link>
    </nav>
  );

  if (loading) return <p className="text-sm text-slate-500">{t("reference.loading")}</p>;
  if (!reference) return <div className="mx-auto max-w-4xl">{navLinks}<p className="text-sm text-slate-500">{t("reference.empty")}</p></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {navLinks}
      <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">{t("reference.eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("reference.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{reference.notice}</p>{reference.normalization?.rxcui && <p className="mt-2 text-xs text-slate-500">{t("reference.normalization", { name: reference.normalization.name, rxcui: reference.normalization.rxcui })}</p>}</div>
      {reference.reviewRequired && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
        <p className="font-semibold">⚠ {t("details.manualReview")}</p>
        <p className="mt-1 leading-6">{reference.match?.candidateCount ? t("reference.manualBody", { count: reference.match.candidateCount }) : t("details.manualReviewBody")}</p>
        <Link to={`/items/${itemId}`} className="mt-3 inline-block font-semibold text-amber-800 underline dark:text-amber-200">{t("reference.reviewLink")}</Link>
      </div>}
      {reference.match?.setid && <Card title={t("reference.matched")}>
        <p className="text-sm font-semibold">{reference.match.title}</p>
        <p className="mt-1 text-xs text-slate-500">DailyMed · {reference.match.status === "confirmed" ? "confirmed by you" : `match confidence: ${reference.match.confidence}`}{reference.match.reasons?.length ? ` (${reference.match.reasons.join(", ")})` : ""}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("reference.notYourProduct")} <Link to={`/items/${itemId}`} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("reference.chooseDifferent")}</Link> {t("reference.addIdentifiers")}</p>
      </Card>}
      <Card title={t("reference.sources")}>
        {reference.references?.length ? <ul className="space-y-2">{reference.references.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{source.source} · {source.title} ↗</a></li>)}</ul> : <p className="text-sm text-slate-500">{t("reference.noSources")}</p>}
        {reference.sourceErrors?.length > 0 && <ul className="mt-4 space-y-2 text-sm text-amber-700 dark:text-amber-300">{reference.sourceErrors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">{sections.map(key => <Card key={key} title={t(`reference.sections.${key}`)}>
        {reference[key]?.length ? <ul className="max-h-80 space-y-3 overflow-y-auto text-sm leading-6 text-slate-700 dark:text-slate-300">{reference[key].map((text, index) => <li key={index}>{text}</li>)}</ul> : <p className="text-sm text-slate-500">{t("reference.noSection")}</p>}
      </Card>)}</div>
      {reference.research?.length > 0 && <Card title={t("reference.research")}><ReferenceList references={reference.research} /></Card>}
      {reference.patientEducation?.length > 0 && <Card title={t("reference.education")}><ReferenceList references={reference.patientEducation} /></Card>}
      {reference.supplementReferences?.length > 0 && <Card title={t("reference.supplements")}><ReferenceList references={reference.supplementReferences} /></Card>}
      <Card title={t("reference.saved")}>
        {reference.userProvided?.interactionProfile?.notes && <p className="mb-3 text-sm"><strong>{t("items.notes")}:</strong> {reference.userProvided.interactionProfile.notes}</p>}
        {reference.userProvided?.interactionProfile?.food && <p className="mb-3 text-sm"><strong>{t("items.foodNotes")}:</strong> {reference.userProvided.interactionProfile.food}</p>}
        {reference.userProvided?.warnings?.length ? reference.userProvided.warnings.map((warning, index) => <p key={index} className="mb-2 text-sm">{warning}</p>) : <p className="text-sm text-slate-500">{t("reference.noSavedWarnings")}</p>}
      </Card>
      <p className="text-xs leading-5 text-slate-500">{t("reference.medicalDisclaimer")}</p>
    </div>
  );
}

function ReferenceList({ references }) {
  return <ul className="space-y-2">{references.map((reference, index) => <li key={`${reference.url}-${index}`}><a href={reference.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{reference.title} ↗</a>{reference.published && <p className="text-xs text-slate-500">{reference.published}</p>}</li>)}</ul>;
}
