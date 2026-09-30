// Garde-fou : la documentation ne cite que des scripts npm, des fichiers et des liens qui existent,
// et n'emploie plus le vocabulaire de l'ancienne architecture (hors ADR, qui sont historiques).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { walk } from './lib/walk.mjs';

const NPM_RUN = /npm run ([\w:.-]+)/g;
const REPO_PATH = /`((?:src|scripts|e2e|docs|public|\.github)\/[^`\s]+\.[a-z]{1,4})`/g;
const MD_LINK = /\]\((?!https?:|#|mailto:)([^)#\s]+)/g;
const LEGACY = /zoneless|hydrat|ngx-translate|PortfolioFacade|@angular|angular\.json/i;
const PLACEHOLDER = /[*{<>]/;

const scriptProblems = (path, text, scripts) =>
  [...text.matchAll(NPM_RUN)]
    .filter(([, name]) => !scripts.has(name))
    .map(([, name]) => `${path} : script npm inconnu « npm run ${name} »`);

const pathProblems = (path, text, exists) =>
  [...text.matchAll(REPO_PATH)]
    .filter(([, target]) => !PLACEHOLDER.test(target) && !exists(target))
    .map(([, target]) => `${path} : fichier introuvable « ${target} »`);

const linkProblems = (path, text, exists) =>
  [...text.matchAll(MD_LINK)]
    .filter(([, target]) => !exists(join(dirname(path), target)))
    .map(([, target]) => `${path} : lien relatif cassé « ${target} »`);

const legacyProblems = (path, text) => {
  const legacy = path.includes('docs/adr/') ? null : LEGACY.exec(text);
  return legacy ? [`${path} : vocabulaire de l'ancienne architecture « ${legacy[0]} »`] : [];
};

/** @returns {string[]} problèmes (vide si la documentation est cohérente) */
export function checkDocs({ files, scripts, exists }) {
  return files.flatMap(({ path, text }) => [
    ...scriptProblems(path, text, scripts),
    ...pathProblems(path, text, exists),
    ...linkProblems(path, text, exists),
    ...legacyProblems(path, text),
  ]);
}

export function run() {
  const paths = ['README.md', 'CLAUDE.md', 'ROADMAP.md', ...walk('docs', ['.md'])];
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  return checkDocs({
    files: paths.map((path) => ({ path, text: readFileSync(path, 'utf8') })),
    scripts: new Set(Object.keys(scripts)),
    exists: existsSync,
  });
}

if (import.meta.main) {
  const problems = run();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log('check-docs: OK');
}
