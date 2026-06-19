/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Japandi Color Palette
        'warm-white': '#faf8f5',
        'soft-teal': '#6fb7b8',
        'soft-teal-dark': '#5f9fa0',
        'soft-teal-light': '#8dd4d5',
        'muted-coral': '#d4866a',
        'muted-coral-dark': '#c46f5f',
        'muted-coral-light': '#dfa088',
        'herbal-green': '#7a9b6e',
        'herbal-green-dark': '#6b8b5e',
        'herbal-green-light': '#8dae7f',
        'deep-charcoal': '#2d2623',
        'light-gray': '#e8e5e0',
        'medium-gray': '#d4cfc8',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
        '6xl': ['3.75rem', { lineHeight: '1.2' }],
        '7xl': ['4.5rem', { lineHeight: '1.2' }],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.05em',
        widest: '0.1em',
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'pulse-down': 'pulse-down 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-down': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(45, 38, 35, 0.08)',
        'medium': '0 8px 24px rgba(45, 38, 35, 0.12)',
        'warm': '0 2px 8px rgba(212, 134, 106, 0.1)',
        'teal': '0 4px 12px rgba(111, 183, 184, 0.2)',
        'coral': '0 4px 12px rgba(212, 134, 106, 0.2)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'gentle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
