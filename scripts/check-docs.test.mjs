import { describe, expect, it } from 'vitest';
import { checkDocs, run } from './check-docs.mjs';

const scripts = new Set(['build', 'verify', 'check:docs']);
const existing = new Set(['src/lib/seo.ts', 'docs/ui.md']);
const check = (text, path = 'README.md') =>
  checkDocs({ files: [{ path, text }], scripts, exists: (p) => existing.has(p) });

describe('check-docs : ce qui doit échouer', () => {
  it('un script npm inexistant', () => {
    expect(check('Lancer `npm run deploy`')).toEqual([
      'README.md : script npm inconnu « npm run deploy »',
    ]);
  });

  it('un fichier cité qui n’existe plus', () => {
    expect(check('Voir `src/lib/ancien.ts`')).toEqual([
      'README.md : fichier introuvable « src/lib/ancien.ts »',
    ]);
  });

  it('un lien relatif cassé', () => {
    expect(check('[guide](docs/absent.md)')).toEqual([
      'README.md : lien relatif cassé « docs/absent.md »',
    ]);
  });

  it("le vocabulaire de l'ancienne architecture, sauf dans les ADR", () => {
    expect(check('Le mode zoneless est activé')).toHaveLength(1);
    expect(check('Le mode zoneless était activé', 'docs/adr/0001.md')).toEqual([]);
  });
});

describe('check-docs : ce qui doit passer', () => {
  it('cite des scripts, fichiers et liens existants ; ignore les motifs', () => {
    const text =
      'Lancer `npm run build` puis `npm run check:docs`. Voir `src/lib/seo.ts`, [UI](docs/ui.md), ' +
      '`e2e/*.spec.ts`, `src/content/{fr,en}/x.json`, [site](https://exemple.fr), [ancre](#haut).';
    expect(check(text)).toEqual([]);
  });

  it('résout les liens relatifs depuis le dossier du document', () => {
    expect(check('[UI](ui.md)', 'docs/geo.md')).toEqual([]);
  });

  it('la documentation actuelle du dépôt est cohérente', () => {
    expect(run()).toEqual([]);
  });
});
