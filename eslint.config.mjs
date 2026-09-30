import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

/** Limites de conception : petites fonctions, faible complexité, pas de nombres magiques. */
const designRules = {
  'max-lines-per-function': [
    'error',
    { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
  complexity: ['error', 8],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-nested-callbacks': ['error', 3],
  '@typescript-eslint/no-magic-numbers': [
    'error',
    {
      ignore: [0, 1, -1],
      ignoreArrayIndexes: true,
      ignoreEnums: true,
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
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
    rules: {
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  {
    files: ['*.config.{ts,mjs}'],
    rules: { '@typescript-eslint/no-magic-numbers': 'off', 'no-undef': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off', 'no-undef': 'off', '@typescript-eslint/no-magic-numbers': 'off' },
  },
  eslintConfigPrettier,
);
