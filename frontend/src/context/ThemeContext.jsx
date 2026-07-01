import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('flextag-theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // Remove both classes then add the current one
    root.classList.remove('dark', 'light')
    root.classList.add(theme)

    // Update body background for instant feel
    if (theme === 'dark') {
      body.style.backgroundColor = '#000000'
      body.style.color = '#d4d4d8'
    } else {
      body.style.backgroundColor = '#fafafa'
      body.style.color = '#52525b'
    }

    localStorage.setItem('flextag-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
