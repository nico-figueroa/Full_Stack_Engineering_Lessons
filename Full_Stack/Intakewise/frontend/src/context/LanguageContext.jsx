import { useEffect, useMemo, useState } from "react";
import { supportedLanguage, translate } from "../i18n.js";
import { LanguageContext } from "./LanguageContextValue.js";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => supportedLanguage(
    localStorage.getItem("language") || navigator.language?.slice(0, 2),
  ));

  function setLanguage(value) {
    setLanguageState(supportedLanguage(value));
  }

  function toggleLanguage() {
    setLanguageState(current => (current === "en" ? "es" : "en"));
  }

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage,
    t: (key, values) => translate(language, key, values),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

