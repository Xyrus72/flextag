import { createContext, useContext, useEffect, useRef, useState } from 'react'

/**
 * Single source of truth for light/dark mode. Applies <html data-theme="…">
 * (index.css tokens key off that attribute) and persists the choice, so every
 * ThemeToggle instance across the app — landing navbar, every dashboard shell —
 * stays in sync instead of each keeping its own local state.
 */
const KEY = 'flextag-theme'
const getInitial = () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'light' ? 'light' : 'dark')

/**
 * A theme flip changes background/border/color on nearly every element at
 * once. Each one already has its own transition (buttons, cards, inputs),
 * so without this every one of those fires simultaneously and the flip
 * smears instead of snapping. Freeze all transitions for one frame, apply
 * the attribute, then release on the next frame.
 */
function suppressTransitionsForFlip(apply) {
  const style = document.createElement('style')
  style.textContent = '*, *::before, *::after { transition: none !important; }'
  document.head.appendChild(style)
  apply()
  // Force layout so the attribute change is committed before we remove the freeze.
  document.body.offsetHeight
  requestAnimationFrame(() => style.remove())
}

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitial)
  const first = useRef(true)

  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem(KEY, theme)
    }
    if (first.current) { first.current = false; apply() }
    else suppressTransitionsForFlip(apply)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
