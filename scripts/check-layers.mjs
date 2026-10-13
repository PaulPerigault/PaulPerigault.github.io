// Garde-fou : les imports respectent le sens des dépendances entre couches (scripts/lib/layers.mjs).
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { localImports } from './lib/imports.mjs';
import { isAllowed, isInLayer } from './lib/layers.mjs';
import { walk } from './lib/walk.mjs';

export function findViolations(files) {
  return files.flatMap(({ path, source }) =>
    localImports(path, source)
      .filter((target) => !isAllowed(path, target))
      .map((target) => ({ file: path, target })),
  );
}

/**
 * Garde-fou du garde-fou : un fichier hors couche est autorisé par conception. Si plus aucun fichier
 * n'est rattaché à une couche (chemins mal normalisés, par exemple des `\` sous Windows), le contrôle
 * passerait sans rien vérifier : on échoue au lieu de laisser passer.
 */
export function coverageProblem(files) {
  return files.length > 0 && !files.some(({ path }) => isInLayer(path))
    ? `aucun des ${files.length} fichiers de src/ n'appartient à une couche : chemins mal normalisés ?`
    : null;
}

const collect = (root) =>
  walk(`${root}/src`, ['.ts', '.astro']).map((file) => ({
    path: posix.relative(root.replaceAll('\\', '/'), file),
    source: readFileSync(file, 'utf8'),
  }));

export function run(root = process.cwd()) {
  const files = collect(root);
  const problem = coverageProblem(files);
  if (problem) throw new Error(problem);
  return findViolations(files);
}

const runOrExit = () => {
  try {
    return run();
  } catch (error) {
    console.error(`check-layers: ${error instanceof Error ? error.message : error}`);
    return process.exit(1);
  }
};

if (import.meta.main) {
  const violations = runOrExit();
  for (const { file, target } of violations)
    console.error(`${file} ne peut pas importer ${target}`);
  if (violations.length > 0) process.exit(1);
  console.log('check-layers: OK');
}
