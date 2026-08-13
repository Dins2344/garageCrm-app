import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules', '.expo', 'dist', 'web-build', 'android', 'ios']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node, ...globals.browser, __DEV__: 'readonly' },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // `useEffect(() => { fetchX(); }, [deps]) ` is this app's (and the
      // web frontend's) standard data-fetching pattern, used on every
      // screen. The React Compiler ruleset added in eslint-plugin-react-hooks
      // v7 flags it as a hard error in favor of an ignore-flag/AbortController
      // guard or a data-fetching library — a real architectural change, not
      // a mechanical fix. Kept as a warning so it stays visible without
      // blocking every push; revisit if/when the fetch pattern is reworked.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // jest.mock(() => require(...)) factories must be self-contained — they
    // can't reference a top-level `import` due to Jest's hoisting, so
    // require() is the idiomatic form here.
    files: ['jest.setup.ts', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])
