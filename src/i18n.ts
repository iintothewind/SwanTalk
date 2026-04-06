import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { APP_CONFIG } from './config';

import enTranslation from './locales/en/translation.json';
import zhTranslation from './locales/zh/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      zh: { translation: zhTranslation },
    },
    fallbackLng: APP_CONFIG.defaultLocale,
    lng: localStorage.getItem('swan-talk-lang') || undefined,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'swan-talk-lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
