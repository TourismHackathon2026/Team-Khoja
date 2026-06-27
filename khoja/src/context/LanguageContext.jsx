/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { createTranslator } from '../lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem('khoja-lang') || 'en'
  );

  const toggleLanguage = () => {
    const next = lang === 'en' ? 'ne' : 'en';
    setLang(next);
    localStorage.setItem('khoja-lang', next);
  };

  const t = createTranslator(lang);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}