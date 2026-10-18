// Garde-fou des fusions de PR : toute commande `gh pr merge` doit viser une PR numérotée dont la
// base réelle (lue sur GitHub) est `develop`. Base illisible, numéro absent ou autre base = refus.
// Seule une sous-commande qui commence par `gh pr … merge` est une fusion : le même texte entre
// guillemets (message de commit, grep) n'en est pas une, sauf passé à un shell (`bash -c "…"`).
// La lecture de la base est injectée (`readBase`) : la logique reste pure et testable.

const SEPARATOR = /[;&|\n]/;
const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g;
const GH = /^gh(?:\.exe)?$/i;
const SHELL = /^(?:bash|sh|zsh|pwsh|powershell|cmd)(?:\.exe)?$/i;
const ASSIGNMENT = /^\w+=/;
// `-Ro/r`, `-R=o/r`, `--repo=o/r` : options de dépôt collées à leur valeur.
const GLUED_REPO = /^(?:-R=?|--repo=)(.+)$/;
const REPO_FLAGS = new Set(['-R', '--repo']);
const VALUE_FLAGS = new Set([
  ...REPO_FLAGS,
  ...['-t', '--subject', '-b', '--body', '-F', '--body-file', '-A', '--author-email'],
  '--match-head-commit',
]);
const ALLOWED_BASE = 'develop';

/** Sous-commandes séparées par `;`, `&`, `|` ou un saut de ligne situés hors guillemets. */
const segmentsOf = (command) => {
  const segments = [];
  let quote = null;
  let start = 0;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote) quote = char === quote ? null : quote;
    else if (char === '"' || char === "'") quote = char;
    else if (SEPARATOR.test(char)) {
      segments.push(command.slice(start, i));
      start = i + 1;
    }
  }
  return [...segments, command.slice(start)];
};

/** `--repo=o/r` devient `--repo o/r` : une seule forme à analyser ensuite. */
const expandGlued = (tokens) =>
  tokens.flatMap((token) => {
    const glued = GLUED_REPO.exec(token);
    return glued ? ['--repo', glued[1]] : [token];
  });

const tokensOf = (segment) =>
  expandGlued([...segment.matchAll(TOKEN)].map((m) => m[1] ?? m[2] ?? m[3]));

/** Arguments d'une fusion (`--repo` placé avant `merge` compris), ou null si ce n'en est pas une. */
const mergeArgs = (tokens) => {
  if (!GH.test(tokens[0] ?? '') || tokens[1] !== 'pr') return null;
  const repo = [];
  for (let i = 2; i < tokens.length; i += 2) {
    if (tokens[i] === 'merge') return [...repo, ...tokens.slice(i + 1)];
    if (!REPO_FLAGS.has(tokens[i])) return null;
    repo.push(tokens[i], tokens[i + 1]);
  }
  return null;
};

/** Invocations de fusion d'une commande, réduites à leurs arguments (shells imbriqués compris). */
const mergeInvocations = (command) =>
  segmentsOf(command).flatMap((segment) => {
    const tokens = tokensOf(segment);
    while (ASSIGNMENT.test(tokens[0] ?? '')) tokens.shift();
    if (SHELL.test(tokens[0] ?? '')) return tokens.slice(1).flatMap(mergeInvocations);
    const args = mergeArgs(tokens);
    return args ? [args] : [];
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
