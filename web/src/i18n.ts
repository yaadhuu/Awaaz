import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

/** Hindi and Malayalam strings load only when chosen, to keep the first page light. */
export async function loadLang(lang: 'en' | 'hi' | 'ml') {
  if (lang !== 'en' && !i18n.hasResourceBundle(lang, 'translation')) {
    const mod = lang === 'hi' ? await import('./locales/hi') : await import('./locales/ml')
    i18n.addResourceBundle(lang, 'translation', mod.default)
  }
  await i18n.changeLanguage(lang)
}

export default i18n
