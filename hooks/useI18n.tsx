
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { loadLanguage, saveLanguage } from '../services/storageService';

const translations: Record<string, any> = {};

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(loadLanguage());
  const [isLoaded, setIsLoaded] = useState(false);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  useEffect(() => {
    const fetchTranslations = async () => {
      setIsLoaded(false);
      // Always fetch, to allow for language changes
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        translations[language] = data;
      } catch (error) {
        console.error(`Could not load translations for ${language}, falling back to English.`, error);
        if (language !== 'en') {
          try {
            const response = await fetch(`/locales/en.json`);
            const data = await response.json();
            translations['en'] = data;
            translations[language] = data; // Cache fallback under the requested language to avoid refetching
          } catch (e) {
             console.error(`Could not load fallback English translations.`, e);
          }
        }
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTranslations();
  }, [language]);
  
  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
      const langTranslations = translations[language] || translations['en'];
      let translation = langTranslations?.[key] || key;
      
      if (replacements) {
        Object.keys(replacements).forEach(placeholder => {
          translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
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
