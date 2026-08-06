import React, { createContext, useContext, useEffect } from 'react'

// FlexTag is permanently dark-themed. ThemeContext kept for import compatibility.
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Always enforce dark class and dark background
    const root = document.documentElement
    root.classList.remove('light')
    root.classList.add('dark')
    document.body.style.backgroundColor = '#050816'
    document.body.style.color = '#d4d4d8'
    localStorage.setItem('flextag-theme', 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
