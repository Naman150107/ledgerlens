import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'dist-ssr/**',
    'node_modules/**',
    'logs/**',
    '*.log',
    '*.local',
    '.vscode/**',
    '.idea/**',
    '.agents/**',
    '.claude/**',
    '.kilocode/**',
    'skills-lock.json',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md'
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js', 'api/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
])
