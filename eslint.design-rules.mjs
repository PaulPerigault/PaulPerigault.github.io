/**
 * Limites de conception : petites fonctions, faible complexité, pas de nombres magiques.
 * Source unique, partagée par la config ESLint du site et celle du Worker (`worker/eslint.config.mjs`).
 */
export const designRules = {
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

/** Les tests décrivent des cas : blocs `describe` longs et valeurs littérales assumés. */
export const testRelaxations = {
  'max-lines-per-function': 'off',
  'max-nested-callbacks': 'off',
  '@typescript-eslint/no-magic-numbers': 'off',
};
