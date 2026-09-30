// Lance un vrai `astro build` dans un dossier temporaire, sans accès réseau par défaut.
// Les builds partagent le cache `.astro/` : un verrou (mkdir atomique) les sérialise entre les
// fichiers de test exécutés en parallèle. Asynchrone pour laisser vivre un faux serveur local.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const LOCK = join(tmpdir(), 'portfolio-astro-build.lock');
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

const run = (outDir, env) =>
  new Promise((resolve) => {
    const child = spawn('npx', ['astro', 'build', '--outDir', outDir], {
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
    child.on('close', (status) => resolve({ status, output }));
  });

/** @returns {Promise<{ status: number | null, output: string, outDir: string }>} */
export async function buildSite({ env = {} } = {}) {
  const outDir = join(mkdtempSync(join(tmpdir(), 'site-')), 'out');
  await acquire();
  try {
    return { ...(await run(outDir, env)), outDir };
  } finally {
    rmSync(LOCK, { recursive: true, force: true });
  }
}
