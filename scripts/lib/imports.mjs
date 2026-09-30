import { dirname, join, normalize } from 'node:path';

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
