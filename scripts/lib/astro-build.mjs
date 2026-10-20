// Lance un vrai `astro build` dans un dossier temporaire, sans accès réseau par défaut.
// Les builds partagent le cache `.astro/` : un verrou (mkdir atomique) les sérialise entre les
// fichiers de test exécutés en parallèle. Asynchrone pour laisser vivre un faux serveur local.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const LOCK = join(tmpdir(), 'portfolio-astro-build.lock');
const BUILDS_DIR = join('.astro', 'test-builds');
const POLL_MS = 100;
// Port fermé : hors réseau, l'appel GitHub échoue tout de suite ; les tests qui en ont besoin le remplacent.
const OFFLINE_GITHUB = 'http://127.0.0.1:9';

async function acquire() {
  for (;;) {
    try {
      mkdirSync(LOCK);
      return;
    } catch {
      await sleep(POLL_MS);
    }
  }
}

// Le binaire d'Astro lancé par Node lui-même : `npx` est un `.cmd` sous Windows (spawn → ENOENT).
const ASTRO_BIN = join('node_modules', 'astro', 'bin', 'astro.mjs');

const run = (outDir, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [ASTRO_BIN, 'build', '--outDir', outDir], {
      env: {
        ...process.env,
        CI: 'false',
        STRICT_DATA: 'false',
        GITHUB_API_URL: OFFLINE_GITHUB,
        ...env,
      },
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    // Lancement impossible (binaire introuvable…) : rejet explicite, jamais un faux « échec du
    // build » qu'un test attendant un échec pourrait prendre pour le comportement voulu.
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, output }));
  });

/** Supprime le dossier d'un build de test (sinon `.astro/test-builds` grossit à chaque `npm test`). */
export function disposeBuild(outDir) {
  rmSync(dirname(outDir), { recursive: true, force: true });
}

/** @returns {Promise<{ status: number | null, output: string, outDir: string }>} */
export async function buildSite({ env = {} } = {}) {
  // Même disque que le dépôt (dans `.astro/`, ignoré par Git) : Astro déplace ses assets avec
  // `rename`, qui échoue entre deux disques (EXDEV, par exemple dépôt sur D: et %TEMP% sur C:).
  mkdirSync(BUILDS_DIR, { recursive: true });
  const outDir = join(mkdtempSync(join(BUILDS_DIR, 'site-')), 'out');
  await acquire();
  try {
    return { ...(await run(outDir, env)), outDir };
  } finally {
    rmSync(LOCK, { recursive: true, force: true });
  }
}
