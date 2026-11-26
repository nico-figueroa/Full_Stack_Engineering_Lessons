import { useContext } from "react";
import { LanguageContext } from "./LanguageContextValue.js";

export default function useLanguage() {
  return useContext(LanguageContext);
}

