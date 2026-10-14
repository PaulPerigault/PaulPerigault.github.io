// Mesure l'outillage avec hyperfine (binaire Rust, hors dépôt) : `npm run bench [-- lint build]`.
// Résultats bruts dans bench-results.json (ignoré par Git) ; méthode : docs/tooling.md.
import { spawnSync } from 'node:child_process';
import { BENCH_COMMANDS, hyperfineArgs } from './lib/bench.mjs';

const RUNS = 5;
const OUTPUT = 'bench-results.json';

const main = () => {
  const requested = process.argv.slice(2);
  const names = requested.length > 0 ? requested : Object.keys(BENCH_COMMANDS);
  const args = hyperfineArgs({ names, runs: RUNS, exportJson: OUTPUT });
  const result = spawnSync('hyperfine', args, { stdio: 'inherit' });
  if (result.error) {
    console.error(
      'bench : hyperfine introuvable (brew install hyperfine, cargo binstall hyperfine)',
    );
    return 1;
  }
  return result.status ?? 1;
};

if (import.meta.main) process.exit(main());
