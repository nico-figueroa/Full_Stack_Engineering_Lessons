import { createContext } from "react";
import { translate } from "../i18n.js";

export const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, values) => translate("en", key, values),
});

