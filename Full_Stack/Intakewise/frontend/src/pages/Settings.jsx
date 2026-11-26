import Card from "../components/ui/Card.jsx";
import { Link } from "react-router-dom";
import useLanguage from "../context/useLanguage.js";

export default function Settings() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-violet-700 dark:text-violet-300">{t("settings.eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold">{t("settings.title")}</h1></div>
      <Card title={t("settings.appearance")}><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("settings.appearanceBody")}</p></Card>
      <Card title={t("settings.routine")}><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("settings.routineBody")}</p><Link to="/items" className="mt-3 inline-block text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">{t("dashboard.manageItems")}</Link></Card>
      <Card title={t("settings.privacy")}><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t("settings.privacyBody")}</p></Card>
    </div>
  );
}
