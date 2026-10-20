// Garde-fou : la documentation ne cite que des scripts npm, des fichiers et des liens qui existent.
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { reportAndExit } from './lib/report.mjs';
import { walk } from './lib/walk.mjs';

const NPM_RUN = /npm run ([\w:.-]+)/g;
const REPO_PATH = /`((?:src|scripts|e2e|docs|public|\.github)\/[^`\s]+\.[a-z]{1,4})`/g;
const MD_LINK = /\]\((?!https?:|#|mailto:)([^)#\s]+)/g;
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
    .filter(([, target]) => !exists(posix.join(posix.dirname(path), target)))
    .map(([, target]) => `${path} : lien relatif cassé « ${target} »`);

/** @returns {string[]} problèmes (vide si la documentation est cohérente) */
export function checkDocs({ files, scripts, exists }) {
  return files.flatMap(({ path, text }) => [
    ...scriptProblems(path, text, scripts),
    ...pathProblems(path, text, exists),
    ...linkProblems(path, text, exists),
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
  reportAndExit('check-docs', run());
}
