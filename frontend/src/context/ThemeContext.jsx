import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Single source of truth for light/dark mode. Applies <html data-theme="…">
 * (index.css tokens key off that attribute) and persists the choice, so every
 * ThemeToggle instance across the app — landing navbar, every dashboard shell —
 * stays in sync instead of each keeping its own local state.
 */
const KEY = 'flextag-theme'
const getInitial = () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'light' ? 'light' : 'dark')

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
