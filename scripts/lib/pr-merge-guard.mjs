// Garde-fou des fusions de PR : toute commande `gh pr merge` doit viser une PR numérotée dont la
// base réelle (lue sur GitHub) est `develop`. Base illisible, numéro absent ou autre base = refus.
// La lecture de la base est injectée (`readBase`) : la logique reste pure et testable.

const MERGE = /\bgh(?:\.exe)?\s+pr\s+merge\b/g;
// Fin d'une sous-commande : séparateurs shell et PowerShell hors guillemets.
const SEGMENT_END = /[;&|\n]/;
const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g;
const VALUE_FLAGS = new Set([
  '-t',
  '--subject',
  '-b',
  '--body',
  '-F',
  '--body-file',
  '-A',
  '--author-email',
  '--match-head-commit',
  '-R',
  '--repo',
]);
const ALLOWED_BASE = 'develop';

const segmentAfter = (command, start) => {
  let quote = null;
  for (let i = start; i < command.length; i += 1) {
    const char = command[i];
    if (quote) quote = char === quote ? null : quote;
    else if (char === '"' || char === "'") quote = char;
    else if (SEGMENT_END.test(char)) return command.slice(start, i);
  }
  return command.slice(start);
};

// `--repo=o/r` devient `--repo o/r` : une seule forme à analyser ensuite.
const tokensOf = (text) =>
  [...text.matchAll(TOKEN)]
    .map((m) => m[1] ?? m[2] ?? m[3])
    .flatMap((token) =>
      token.startsWith('--repo=') ? ['--repo', token.slice('--repo='.length)] : [token],
    );
const REPO_FLAGS = new Set(['-R', '--repo']);

/** Lit le sélecteur de PR et l'option `--repo` d'une invocation `gh pr merge`. */
export function parseMerge(argsText) {
  const tokens = tokensOf(argsText);
  let selector = null;
  let repo = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (VALUE_FLAGS.has(token)) {
      if (REPO_FLAGS.has(token)) repo = tokens[i + 1] ?? null;
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

/** Invocations `gh pr merge` d'une commande, chacune réduite à ses arguments. */
function mergeInvocations(command) {
  return [...command.matchAll(MERGE)].map((m) => segmentAfter(command, m.index + m[0].length));
}

/**
 * @param {string} command commande Bash ou PowerShell
 * @param {(pr: string, repo: string | null) => string | null} readBase base de la PR, null si illisible
 * @returns {string | null} raison du refus, ou null si la commande est acceptée
 */
export function mergeRefusal(command, readBase) {
  for (const args of mergeInvocations(command)) {
    const { selector, repo } = parseMerge(args);
    const pr = prNumber(selector);
    if (!pr) return 'Fusion refusée : `gh pr merge` doit citer un numéro de PR explicite.';
    const base = readBase(pr, repo);
    if (!base) return `Fusion refusée : base de la PR #${pr} illisible.`;
    if (base !== ALLOWED_BASE) {
      return `Fusion refusée : la PR #${pr} vise « ${base} » ; seules les PR vers develop sont fusionnées par l'assistant.`;
    }
  }
  return null;
}
