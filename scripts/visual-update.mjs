// Régénère les références visuelles (e2e/__snapshots__/visual.spec.ts/) dans l'image Playwright
// de la CI, via Docker (ou Colima) : `npm run build` d'abord, puis `npm run test:visual:update`.
// Sous Windows et macOS, c'est la seule façon d'obtenir les pixels du job CI `visual`.
import { spawnSync } from 'node:child_process';
import { VISUAL_IMAGE, VISUAL_PLATFORM } from './lib/visual-image.mjs';

const args = [
  'run',
  '--rm',
  `--platform=${VISUAL_PLATFORM}`,
  '-v',
  `${process.cwd()}:/work`,
  '-w',
  '/work',
  '-e',
  'VISUAL=1',
  '-e',
  'CI=1',
  VISUAL_IMAGE,
  'npx',
  'playwright',
  'test',
  'e2e/visual.spec.ts',
  '--update-snapshots',
  ...process.argv.slice(2),
];
const result = spawnSync('docker', args, { stdio: 'inherit' });
if (result.error) console.error(`docker introuvable : ${result.error.message}`);
process.exitCode = result.status ?? 1;
