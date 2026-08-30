import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/** White/dark mode switch — reflects and updates the shared ThemeContext. */
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="icon-toggle"
      style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        border: '1px solid rgba(var(--ink-rgb),0.12)',
        background: 'rgba(var(--ink-rgb),0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-muted)',
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle
