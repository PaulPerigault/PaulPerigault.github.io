// Garde-fou : les imports respectent le sens des dépendances entre couches (scripts/lib/layers.mjs).
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { localImports } from './lib/imports.mjs';
import { isAllowed } from './lib/layers.mjs';
import { walk } from './lib/walk.mjs';

export function findViolations(files) {
  return files.flatMap(({ path, source }) =>
    localImports(path, source)
      .filter((target) => !isAllowed(path, target))
      .map((target) => ({ file: path, target })),
  );
}

export function run(root = process.cwd()) {
  const files = walk(`${root}/src`, ['.ts', '.astro']).map((file) => ({
    path: relative(root, file),
    source: readFileSync(file, 'utf8'),
  }));
  return findViolations(files);
}

if (import.meta.main) {
  const violations = run();
  for (const { file, target } of violations)
    console.error(`${file} ne peut pas importer ${target}`);
  if (violations.length > 0) process.exit(1);
  console.log('check-layers: OK');
}
