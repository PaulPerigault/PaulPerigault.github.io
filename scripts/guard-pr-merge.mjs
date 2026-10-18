// Hook PreToolUse de Claude Code (Bash et PowerShell) : toute commande `gh pr merge` n'est acceptée
// que si la base réelle de la PR, lue par `gh pr view`, est `develop`. Code de sortie 2 = commande
// bloquée, avec la raison sur stderr. Entrée illisible ou base illisible = blocage.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mergeRefusal } from './lib/pr-merge-guard.mjs';

const BLOCK = 2;
const GH_TIMEOUT_MS = 15_000;

/** Base de la PR lue sur GitHub, ou null si gh échoue (réseau, PR inconnue, droits). */
function readBaseWithGh(pr, repo) {
  const args = ['pr', 'view', pr, '--json', 'baseRefName', '--jq', '.baseRefName'];
  if (repo) args.push('--repo', repo);
  try {
    const out = execFileSync('gh', args, {
      encoding: 'utf8',
      timeout: GH_TIMEOUT_MS,
      stdio: 'pipe',
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

/** @returns {string | null} raison du refus, ou null si la commande est acceptée */
export function decide(rawEvent, readBase = readBaseWithGh) {
  let command;
  try {
    command = JSON.parse(rawEvent)?.tool_input?.command;
  } catch {
    return 'Événement de hook illisible : commande refusée par prudence.';
  }
  return typeof command === 'string' ? mergeRefusal(command, readBase) : null;
}

if (import.meta.main) {
  const reason = decide(readFileSync(0, 'utf8'));
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(BLOCK);
  }
}
