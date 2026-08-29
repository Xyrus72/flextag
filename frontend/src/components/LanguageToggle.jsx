import { useLanguage } from '../context/LanguageContext'

/**
 * EN / বাংলা switch. Sits next to ThemeToggle and matches its shape, so the two
 * personal settings live together wherever the shell puts them.
 */
const LanguageToggle = () => {
  const { lang, toggleLang, t } = useLanguage()
  const next = lang === 'en' ? 'বাংলা' : 'English'

  return (
    <button
      onClick={toggleLang}
      aria-label={`${t('common.language')}: ${next}`}
      title={next}
      style={{
        height: 38, minWidth: 44, padding: '0 10px', borderRadius: 10, flexShrink: 0,
        border: '1px solid rgba(var(--ink-rgb),0.12)',
        background: 'rgba(var(--ink-rgb),0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-muted)',
        fontSize: 12, fontWeight: 800, fontFamily: 'inherit', letterSpacing: '0.02em',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb),0.12)'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {lang === 'en' ? 'বাং' : 'EN'}
    </button>
  )
}

export default LanguageToggle
