import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // `.claude/skills` and `.references` are third-party content we do not own
    // and must not reformat — see docs/SKILLS.md.
    // `spikes/` are throwaway proof-of-concept entries (R3F frame-path mutation that the
    // React Compiler rules reject by design) and `e2e/*.mjs` are capture scripts mixing Node
    // and in-page globals. Neither ships. Production extraction from a spike must pass lint.
    ignores: ['dist', 'node_modules', 'public', '.references', '.claude', 'spikes', 'e2e/*.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The R3F reconciler relies on intrinsic elements that look unusual to
      // generic React lint rules; keep the surface small rather than fighting it.
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'e2e/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
