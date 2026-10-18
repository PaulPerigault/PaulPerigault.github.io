// Point d'entrée commun des commandes d'infrastructure : dépendances réelles (environnement,
// fichiers, processus, réseau, console) injectées, erreur affichée sans pile, code de sortie 1.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const defaults = () => ({
  env: { ...process.env },
  readFile: (path) => readFileSync(path, 'utf8'),
  root: ROOT,
  spawn: spawnSync,
  fetch: globalThis.fetch,
  log: (line) => console.log(line),
});

/** @param {(deps: ReturnType<typeof defaults>) => number | Promise<number>} command */
export async function runCli(command) {
  try {
    process.exitCode = await command(defaults());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
