// Hook PreToolUse de Claude Code (Bash et PowerShell, voir .claude/settings.json) : refuse toute
// commande qui cite un fichier de secrets local. Les outils Read/Edit sont couverts par les `deny`.
// Code de sortie 2 = commande bloquée, avec la raison sur stderr. Entrée illisible = blocage.
import { readFileSync } from 'node:fs';
import { secretFilesIn } from './lib/secret-files.mjs';

const BLOCK = 2;

/** @returns {string | null} raison du refus, ou null si la commande est acceptée */
export function decide(rawEvent) {
  let command;
  try {
    command = JSON.parse(rawEvent)?.tool_input?.command;
  } catch {
    return 'Événement de hook illisible : commande refusée par prudence.';
  }
  if (typeof command !== 'string') return null;
  const files = secretFilesIn(command);
  return files.length > 0
    ? `Commande refusée : elle cite un fichier de secrets (${files.join(', ')}). ` +
        'Ces fichiers ne sont ni lus, ni copiés, ni modifiés par l’assistant.'
    : null;
}

if (import.meta.main) {
  const reason = decide(readFileSync(0, 'utf8'));
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exit(BLOCK);
  }
}
