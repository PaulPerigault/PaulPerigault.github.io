// Hook PreToolUse de Claude Code (Bash et PowerShell) : toute commande `gh pr merge` n'est acceptée
// que si la base et la tête réelles de la PR, lues par `gh pr view`, sont admises (vers develop, ou
// vers main depuis develop ou release-please : lib/pr-merge-policy.mjs). Code de sortie 2 = commande
// bloquée, avec la raison sur stderr. Entrée illisible ou PR illisible = blocage.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mergeRefusal } from './lib/pr-merge-guard.mjs';

const BLOCK = 2;
const GH_TIMEOUT_MS = 15_000;

const FIELDS = 'baseRefName,headRefName,isCrossRepository';

/** Base et tête de la PR lues sur GitHub, ou null si gh échoue (réseau, PR inconnue, droits). */
function readRefsWithGh(pr, repo) {
  const args = ['pr', 'view', pr, '--json', FIELDS];
  if (repo) args.push('--repo', repo);
  try {
    const out = execFileSync('gh', args, {
      encoding: 'utf8',
      timeout: GH_TIMEOUT_MS,
      stdio: 'pipe',
    });
    const view = JSON.parse(out);
    return {
      base: view.baseRefName,
      head: view.headRefName,
      crossRepository: view.isCrossRepository !== false,
    };
  } catch {
    return null;
  }
}

/** @returns {string | null} raison du refus, ou null si la commande est acceptée */
export function decide(rawEvent, readRefs = readRefsWithGh) {
  let command;
  try {
    command = JSON.parse(rawEvent)?.tool_input?.command;
  } catch {
    return 'Événement de hook illisible : commande refusée par prudence.';
  }
  return typeof command === 'string' ? mergeRefusal(command, readRefs) : null;
}

if (import.meta.main) {
  const reason = decide(readFileSync(0, 'utf8'));
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(BLOCK);
  }
}
