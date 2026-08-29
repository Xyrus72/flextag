import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Context modules deliberately export their hook (useAuth, useTheme, …)
    // beside the provider — the app-wide convention here. The only cost is that
    // editing one of these four files reloads the page instead of hot-swapping.
    files: ['src/context/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
