import { posix } from 'node:path';

// Chemins en `/` sur toutes les plateformes : ils sont comparés aux couches de layers.mjs.
const { dirname, join, normalize } = posix;

// Limite connue : détection par expression régulière (imports statiques, `export … from`,
// `import()` à chaîne littérale). Un `import()` à gabarit (`${…}`) échappe au contrôle : aucun
// usage dans `src/`, et il doit le rester.
const IMPORT_RE = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

/** Chemins (relatifs à la racine du dépôt) des modules locaux importés par un fichier. */
export function localImports(file, source) {
  const targets = [];
  for (const [, specifier] of source.matchAll(IMPORT_RE)) {
    if (specifier.startsWith('@/')) targets.push(join('src', specifier.slice(2)));
    else if (specifier.startsWith('.')) targets.push(normalize(join(dirname(file), specifier)));
  }
  return targets;
}
