import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { designRules, testRelaxations } from '../eslint.design-rules.mjs';

// Mêmes règles de conception que le site (source unique : eslint.design-rules.mjs).
export default defineConfig(
  { ignores: ['node_modules/**', '.wrangler/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: 'error',
      'no-console': 'error',
      'prefer-const': 'error',
      ...designRules,
    },
  },
  { files: ['**/*.test.ts', 'src/test/**/*.ts'], rules: testRelaxations },
  { files: ['*.config.{ts,mjs}'], rules: { '@typescript-eslint/no-magic-numbers': 'off' } },
);
