import useLanguage from "../context/useLanguage.js";

function UsaFlag() {
  const stripes = Array.from({ length: 13 }, (_, index) => (
    <rect
      key={index}
      x="0"
      y={index * (20 / 13)}
      width="30"
      height={20 / 13}
      fill={index % 2 === 0 ? "#B22234" : "#FFFFFF"}
    />
  ));
  const stars = [
    [2.2, 1.7], [5.7, 1.7], [9.2, 1.7],
    [4, 4.1], [7.5, 4.1], [11, 4.1],
    [2.2, 6.5], [5.7, 6.5], [9.2, 6.5],
  ];

  return (
    <svg data-testid="language-flag-us" aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10">
      {stripes}
      <rect width="12.5" height="10.8" fill="#3C3B6E" />
      {stars.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r=".7" fill="#FFFFFF" />)}
    </svg>
  );
}

function CostaRicaFlag() {
  return (
    <svg data-testid="language-flag-cr" aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10">
      <rect width="30" height="20" fill="#002B7F" />
      <rect y="3.3" width="30" height="13.4" fill="#FFFFFF" />
      <rect y="6.6" width="30" height="6.8" fill="#CE1126" />
    </svg>
  );
}

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
      {language === "en" ? <UsaFlag /> : <CostaRicaFlag />}
      <span>{currentName}</span>
    </button>
  );
}

