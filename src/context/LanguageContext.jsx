import { createContext, useContext, useState, useCallback } from 'react';
import { t as translate, SUPPORTED_LANGUAGES } from '../utils/translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'swastha_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch { return 'en'; }
  });

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  const t = useCallback((key) => translate(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
