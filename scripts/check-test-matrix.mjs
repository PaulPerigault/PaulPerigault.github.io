// Garde-fou : docs/test-matrix.md et les fichiers e2e/*.spec.ts sont cohérents.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const MATRIX = 'docs/test-matrix.md';
const E2E_DIR = 'e2e';
const SPEC = /`([\w-]+\.spec\.ts)`/g;

/** Lignes de données du tableau : `| fonctionnalité | #issue | tests |`. */
export function parseMatrix(text) {
  return text
    .split('\n')
    .filter((line) => /^\|.*#\d+/.test(line))
    .map((line) => {
      const [feature, issue, tests = ''] = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        feature,
        issue,
        specs: [...tests.matchAll(SPEC)].map((m) => m[1]),
        justified: /^n\/a/i.test(tests),
      };
    });
}

/** @returns {string[]} problèmes détectés (vide si tout est cohérent) */
export function checkMatrix(rows, specFiles) {
  const listed = new Set(rows.flatMap((row) => row.specs));
  return [
    ...rows
      .filter((row) => row.specs.length === 0 && !row.justified)
      .map((row) => `${row.issue} « ${row.feature} » : aucun test e2e ni justification n/a`),
    ...[...listed]
      .filter((spec) => !specFiles.includes(spec))
      .map((spec) => `${spec} est listé dans la matrice mais n'existe pas`),
    ...specFiles
      .filter((spec) => !listed.has(spec))
      .map((spec) => `${spec} n'est rattaché à aucune fonctionnalité de la matrice`),
  ];
}

export function run() {
  const specFiles = existsSync(E2E_DIR)
    ? readdirSync(E2E_DIR).filter((name) => name.endsWith('.spec.ts'))
    : [];
  return checkMatrix(parseMatrix(readFileSync(MATRIX, 'utf8')), specFiles);
}

if (import.meta.main) {
  const problems = run();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log('check-test-matrix: OK');
}
