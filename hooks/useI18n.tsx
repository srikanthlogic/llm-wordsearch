
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';

import { loadLanguage, saveLanguage } from '../services/storageService';

// Strict allowlist: only locales with a shipped translation file may be fetched.
const AVAILABLE_LOCALES = ['bn', 'de', 'en', 'es', 'fr', 'hi', 'ta'] as const;

export function isSupportedLocale(lang: string): boolean {
  return (AVAILABLE_LOCALES as readonly string[]).includes(lang);
}

function toSafeLocale(lang: string): string {
  return isSupportedLocale(lang) ? lang : 'en';
}

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

type TranslationCache = Record<string, any>;

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(() => toSafeLocale(loadLanguage()));
  const [isLoaded, setIsLoaded] = useState(false);
  // Per-provider cache instead of a mutable module-level object, so
  // independent provider instances (tests, embedded views) stay isolated.
  const translationsRef = useRef<TranslationCache>({});
  const warnedKeysRef = useRef<Set<string>>(new Set());

  const setLanguage = (lang: string) => {
    const safe = toSafeLocale(lang);
    setLanguageState(safe);
    saveLanguage(safe);
    document.documentElement.lang = safe;
  };

  useEffect(() => {
    document.documentElement.lang = language;

    let cancelled = false;
    const fetchTranslations = async () => {
      setIsLoaded(false);
      // Always fetch, to allow for language changes
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!cancelled) translationsRef.current[language] = data;
      } catch (error) {
        console.error(`Could not load translations for ${language}, falling back to English.`, error);
        if (language !== 'en') {
          try {
            const response = await fetch(`/locales/en.json`);
            const data = await response.json();
            // Cache fallback under 'en' only; leave the requested key empty so a
            // later attempt retries instead of serving a stale negative cache.
            if (!cancelled) translationsRef.current['en'] = data;
          } catch (e) {
             console.error(`Could not load fallback English translations.`, e);
          }
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    fetchTranslations();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
      const cache = translationsRef.current;
      let translation: any =
        cache[language]?.[key] ??
        cache[language]?.[`${key}_plural`] ??
        cache[language]?.[`${key}_singular`] ??
        cache['en']?.[key] ??
        key;

      // English-style plural selection when a numeric count is supplied and
      // the locale ships _singular/_plural variants for this key.
      const count = replacements?.count;
      if (typeof count === 'number' && cache[language]) {
        const variant = Number.isInteger(count) && count === 1 ? `${key}_singular` : `${key}_plural`;
        if (cache[language][variant] !== undefined) {
          translation = cache[language][variant];
        }
      }

      if (translation === key && process.env.NODE_ENV !== 'production' && !warnedKeysRef.current.has(key)) {
        warnedKeysRef.current.add(key);
        console.warn(`[i18n] Missing translation for key "${key}" (language: ${language})`);
      }

      if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
          translation = String(translation).replace(`{{${placeholder}}}`, String(replacements[placeholder]));
        });
      }

      return translation;
  }, [language]);


  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
