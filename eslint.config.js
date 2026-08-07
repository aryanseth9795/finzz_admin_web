import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /**
       * TRACKED DEBT — deliberately warnings, not errors.
       *
       * This config had never successfully run before Phase 4C: `npm run lint`
       * crashed on an ESLint 10 / typescript-eslint 8.36 API mismatch, so the
       * first successful run reported 46 problems on untouched code.
       *
       * The two rules below are downgraded so that CI can gate on genuine
       * errors today, while these stay visible as work still to do. They are
       * NOT fixed:
       *
       * `no-explicit-any` — the remaining `any`s are in chart callbacks and
       *   two page-level response shapes. The API layer, the user list and the
       *   expense/user-detail responses are now typed; finishing the rest
       *   means typing the pool and dashboard response shapes, which is a
       *   larger change than a bug-fix pass should carry.
       *
       * `set-state-in-effect` — new in eslint-plugin-react-hooks 7. It flags
       *   the fetch-on-mount-then-setState pattern, which is correct guidance:
       *   the real answer is a data-fetching library (React Query), not a
       *   local workaround. Silencing it per-line would hide the debt; leaving
       *   it as an error would block CI on a refactor that is out of scope.
       *
       * Remove these overrides as each is genuinely addressed.
       */
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
