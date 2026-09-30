import { describe, expect, it } from 'vitest';
import { checkMatrix, parseMatrix } from './check-test-matrix.mjs';

const TABLE = `
| Fonctionnalité | Issue | Tests e2e |
|---|---|---|
| Socle | #65 | \`smoke.spec.ts\` |
| Navigation | #71 | \`nav.spec.ts\`, \`menu.spec.ts\` |
| Outillage | #66 | n/a : testé par les scripts |
`;

describe('parseMatrix', () => {
  it('extrait fonctionnalités, issues et fichiers de test', () => {
    expect(parseMatrix(TABLE)).toEqual([
      { feature: 'Socle', issue: '#65', specs: ['smoke.spec.ts'], justified: false },
      {
        feature: 'Navigation',
        issue: '#71',
        specs: ['nav.spec.ts', 'menu.spec.ts'],
        justified: false,
      },
      { feature: 'Outillage', issue: '#66', specs: [], justified: true },
    ]);
  });
});

describe('checkMatrix', () => {
  const rows = parseMatrix(TABLE);
  const files = ['smoke.spec.ts', 'nav.spec.ts', 'menu.spec.ts'];

  it('accepte une matrice cohérente', () => {
    expect(checkMatrix(rows, files)).toEqual([]);
  });

  it('signale un test non rattaché à une fonctionnalité', () => {
    expect(checkMatrix(rows, [...files, 'orphan.spec.ts'])).toEqual([
      "orphan.spec.ts n'est rattaché à aucune fonctionnalité de la matrice",
    ]);
  });

  it('signale un test listé mais absent', () => {
    expect(checkMatrix(rows, ['smoke.spec.ts', 'nav.spec.ts'])).toEqual([
      "menu.spec.ts est listé dans la matrice mais n'existe pas",
    ]);
  });

  it('signale une fonctionnalité sans test ni justification', () => {
    const bare = parseMatrix('| Nouveau | #99 | à faire |');
    expect(checkMatrix(bare, [])).toEqual([
      '#99 « Nouveau » : aucun test e2e ni justification n/a',
    ]);
  });
});
