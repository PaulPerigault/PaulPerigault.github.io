import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import { designRules, testRelaxations } from './eslint.design-rules.mjs';

export default tseslint.config(
  {
    // `worker/` est une brique autonome, avec sa propre config (mêmes règles de conception).
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'worker/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: 'error',
      'no-console': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      ...designRules,
    },
  },
  {
    // Les tests décrivent des cas : blocs `describe` longs et valeurs littérales assumés.
    files: ['**/*.test.{ts,mjs}', 'e2e/**/*.ts', 'src/test/**/*.ts'],
    rules: testRelaxations,
  },
  {
    files: ['*.config.{ts,mjs}', 'eslint.design-rules.mjs'],
    rules: { '@typescript-eslint/no-magic-numbers': 'off', 'no-undef': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off', 'no-undef': 'off', '@typescript-eslint/no-magic-numbers': 'off' },
  },
  eslintConfigPrettier,
);
