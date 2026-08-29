import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { translate, LANGUAGES } from '../i18n/strings'

/**
 * Interface language (English / Bangla).
 *
 * Mirrors ThemeContext: one source of truth, persisted, applied to <html lang>
 * so screen readers and the browser's own text handling know what language the
 * page is in. Components read `t` and re-render together when it changes.
 */
const KEY = 'flextag-lang'
const getInitial = () => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && LANGUAGES.some(l => l.code === saved)) return saved
    // A Bangladeshi visitor whose browser is set to Bangla should not have to hunt for the toggle.
    if (typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('bn')) return 'bn'
  } catch { /* private mode / SSR */ }
  return 'en'
}

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, toggleLang: () => {}, t: (k) => k })

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
  }, [lang])

  const setLang = useCallback((next) => {
    if (LANGUAGES.some(l => l.code === next)) setLangState(next)
  }, [])

  const toggleLang = useCallback(() => setLangState(l => (l === 'en' ? 'bn' : 'en')), [])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, languages: LANGUAGES }), [lang, setLang, toggleLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
/** Shorthand for components that only need the translator. */
export const useT = () => useContext(LanguageContext).t
