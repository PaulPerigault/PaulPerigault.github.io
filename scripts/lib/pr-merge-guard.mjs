// Garde-fou des fusions de PR : toute commande `gh pr merge` doit viser une PR numérotée dont la
// base et la tête réelles (lues sur GitHub) sont admises par lib/pr-merge-policy.mjs. PR illisible,
// numéro absent ou couple base/tête non admis = refus.
// Seule une sous-commande qui commence par `gh pr … merge` est une fusion : le même texte entre
// guillemets (message de commit, grep) n'en est pas une, sauf passé à un shell (`bash -c "…"`).
// La lecture de la PR est injectée (`readRefs`) : la logique reste pure et testable.
import { refsRefusal } from './pr-merge-policy.mjs';
import { segmentsOf, wordsOf } from './shell-segments.mjs';

// `gh` par son nom ou son chemin (`/opt/homebrew/bin/gh`, `C:\\…\\gh.exe`).
const GH = /(?:^|[\\/])gh(?:\.exe)?$/i;
const SHELL = /^(?:bash|sh|zsh|pwsh|powershell|cmd)(?:\.exe)?$/i;
const ASSIGNMENT = /^(\w+)=(.*)$/;
// Lanceurs qui exécutent la commande qui les suit (`env gh …`, `sudo gh …`), et `$` d'un `$(…)`.
const LAUNCHERS = new Set(['env', 'command', 'exec', 'time', 'sudo', 'nohup', '$']);
const PR_URL = /github\.com\/([^/\s]+\/[^/\s]+)\/pull\/\d+/;
// `-Ro/r`, `-R=o/r`, `--repo=o/r` : options de dépôt collées à leur valeur.
const GLUED_REPO = /^(?:-R=?|--repo=)(.+)$/;
const REPO_FLAGS = new Set(['-R', '--repo']);
const VALUE_FLAGS = new Set([
  ...REPO_FLAGS,
  ...['-t', '--subject', '-b', '--body', '-F', '--body-file', '-A', '--author-email'],
  '--match-head-commit',
]);

/** `--repo=o/r` devient `--repo o/r` : une seule forme à analyser ensuite. */
const expandGlued = (tokens) =>
  tokens.flatMap((token) => {
    const glued = GLUED_REPO.exec(token);
    return glued ? ['--repo', glued[1]] : [token];
  });

const tokensOf = (segment) => expandGlued(wordsOf(segment));

/**
 * Arguments d'une fusion, ou null si ce n'en est pas une. `--repo` peut précéder `pr` ou `merge`
 * (`gh -R o/r pr merge 1` est accepté par gh) : il est mis de côté jusqu'à `pr merge`.
 */
const mergeArgs = (tokens) => {
  if (!GH.test(tokens[0] ?? '')) return null;
  const repo = [];
  const rest = [];
  for (let i = 1; i < tokens.length; i += 1) {
    if (rest.length < 2 && REPO_FLAGS.has(tokens[i])) {
      repo.push(tokens[i], tokens[i + 1]);
      i += 1;
    } else rest.push(tokens[i]);
  }
  return rest[0] === 'pr' && rest[1] === 'merge' ? [...repo, ...rest.slice(2)] : null;
};

/**
 * Retire en tête les affectations et les lanceurs (`env`, `sudo`…). `GH_REPO=o/r gh …` change le
 * dépôt visé : il est renvoyé comme un `--repo` à placer devant les arguments.
 */
const stripPrefix = (tokens) => {
  let ghRepo = [];
  for (let head = tokens[0]; head !== undefined; head = tokens[0]) {
    const assignment = ASSIGNMENT.exec(head);
    if (!assignment && !LAUNCHERS.has(head)) break;
    if (assignment?.[1] === 'GH_REPO') ghRepo = ['--repo', assignment[2]];
    tokens.shift();
  }
  return ghRepo;
};

/** Invocations de fusion d'une commande, réduites à leurs arguments (shells imbriqués compris). */
const mergeInvocations = (command) =>
  segmentsOf(command).flatMap((segment) => {
    const tokens = tokensOf(segment);
    const ghRepo = stripPrefix(tokens);
    if (SHELL.test(tokens[0] ?? '')) return tokens.slice(1).flatMap(mergeInvocations);
    const args = mergeArgs(tokens);
    return args ? [[...ghRepo, ...args]] : [];
  });

/** Lit le sélecteur de PR et l'option `--repo` des arguments d'une fusion. */
export function parseMerge(rawArgs) {
  const args = expandGlued(rawArgs);
  let selector = null;
  let repo = null;
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (VALUE_FLAGS.has(token)) {
      if (REPO_FLAGS.has(token)) repo = args[i + 1] ?? null;
      i += 1;
    } else if (!token.startsWith('-')) selector ??= token;
  }
  return { selector, repo };
}

/** Numéro de PR d'un sélecteur (`165`, `#165`, URL `/pull/165`), sinon null. */
export function prNumber(selector) {
  const match = /^#?(\d+)$/.exec(selector ?? '') ?? /\/pull\/(\d+)(?:[/?#]|$)/.exec(selector ?? '');
  return match ? match[1] : null;
}

/**
 * @param {string} command commande Bash ou PowerShell
 * @param {(pr: string, repo: string | null) => import('./pr-merge-policy.mjs').PrRefs | null} readRefs
 *   base et tête de la PR, null si illisibles
 * @returns {string | null} raison du refus, ou null si la commande est acceptée
 */
export function mergeRefusal(command, readRefs) {
  for (const args of mergeInvocations(command)) {
    const parsed = parseMerge(args);
    const selector = parsed.selector;
    // Une URL de PR désigne son propre dépôt, quel que soit le répertoire courant.
    const repo = PR_URL.exec(selector ?? '')?.[1] ?? parsed.repo;
    const pr = prNumber(selector);
    if (!pr) return 'Fusion refusée : `gh pr merge` doit citer un numéro de PR explicite.';
    const refusal = refsRefusal(pr, readRefs(pr, repo));
    if (refusal) return refusal;
  }
  return null;
}
