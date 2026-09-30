// Garde-fou : aucun fichier source ne dépasse MAX_FILE_LINES lignes.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walk } from './lib/walk.mjs';

export const MAX_FILE_LINES = 120;
const EXTENSIONS = ['.ts', '.astro', '.css', '.mjs'];
const ROOTS = ['src', 'e2e', 'scripts'];

export function countLines(text) {
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

export function findOversized(files, max = MAX_FILE_LINES) {
  return files
    .map((file) => ({ file, lines: countLines(readFileSync(file, 'utf8')) }))
    .filter(({ lines }) => lines > max);
}

export function run(root = process.cwd(), max = MAX_FILE_LINES) {
  const files = ROOTS.map((dir) => join(root, dir))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walk(dir, EXTENSIONS));
  return findOversized(files, max);
}

if (import.meta.main) {
  const offenders = run();
  for (const { file, lines } of offenders) {
    console.error(`${file}: ${lines} lignes (max ${MAX_FILE_LINES})`);
  }
  if (offenders.length > 0) process.exit(1);
  console.log(`check-file-size: OK (max ${MAX_FILE_LINES} lignes)`);
}
