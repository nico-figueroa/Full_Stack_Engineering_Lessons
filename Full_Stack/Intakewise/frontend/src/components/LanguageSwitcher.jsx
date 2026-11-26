import useLanguage from "../context/useLanguage.js";

export default function LanguageSwitcher({ className = "" }) {
  const { language, toggleLanguage, t } = useLanguage();
  const currentName = language === "en" ? t("language.english") : t("language.spanish");
  const nextName = language === "en" ? t("language.spanish") : t("language.english");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${className}`}
      aria-label={t("language.switch", { current: currentName, next: nextName })}
      title={t("language.switch", { current: currentName, next: nextName })}
    >
      <span aria-hidden="true" className="text-lg">{language === "en" ? "🇺🇸" : "🇨🇷"}</span>
      <span>{currentName}</span>
    </button>
  );
}

