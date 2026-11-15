import React, { createContext, useContext, useEffect } from "react";
import { id } from "../locales/id";
import type { TranslationType } from "../locales/en";

export type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationType;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "id",
  setLanguage: () => {},
  t: id,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    document.documentElement.lang = "id";
  }, []);

  // Antarmuka aplikasi menggunakan Bahasa Indonesia secara konsisten.
  const setLanguage = (_lang: Language) => {};

  return (
    <LanguageContext.Provider value={{ language: "id", setLanguage, t: id }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
