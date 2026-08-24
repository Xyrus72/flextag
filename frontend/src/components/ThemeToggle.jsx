import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const KEY = 'flextag-theme'
const getStoredTheme = () => localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
const apply = (t) => { document.documentElement.dataset.theme = t }

/** White/dark mode switch — persists to localStorage, flips CSS tokens on <html>. */
const ThemeToggle = () => {
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => { apply(theme) }, [theme])

  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    setTheme(next)
  }

  return (
    <button
      onClick={flip}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        border: '1px solid rgba(var(--ink-rgb),0.12)',
        background: 'rgba(var(--ink-rgb),0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-muted)',
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb),0.12)'; e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle
