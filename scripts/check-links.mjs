// Vérifie les liens du site construit avec lychee (binaire Rust, hors dépôt) : liens internes,
// ancres et URL absolues du domaine, hors ligne. `--external` vérifie aussi les liens sortants.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lycheeArgs, siteOrigin } from './lib/links.mjs';

const INSTALL_HINT =
  'lychee introuvable : brew install lychee, cargo binstall lychee ou https://lychee.cli.rs';

const main = () => {
  const distDir = resolve('dist');
  if (!existsSync(distDir)) {
    console.error('check-links : dist/ absent, lancer « npm run build » avant.');
    return 1;
  }
  const origin = siteOrigin(readFileSync(resolve(distDir, 'robots.txt'), 'utf8'));
  const external = process.argv.includes('--external');
  const result = spawnSync('lychee', lycheeArgs({ distDir, origin, external }), {
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`check-links : ${INSTALL_HINT}`);
    return 1;
  }
  return result.status ?? 1;
};

if (import.meta.main) process.exit(main());
