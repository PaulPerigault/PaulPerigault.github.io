// Commandes mesurées par `npm run bench` (mêmes noms que docs/perf-baseline.md). Lancées sans
// `npm run` pour ne pas mesurer le démarrage de npm.
export const BENCH_COMMANDS = {
  lint: 'npx eslint .',
  format: 'npx prettier --check "{src,e2e,scripts}/**/*.{ts,mjs,astro,css,json}" "*.{ts,mjs,json}"',
  check: 'npx astro check',
  knip: 'npx knip',
  build: 'npx astro build',
  test: 'npx vitest run',
};

/**
 * Arguments de hyperfine : sans shell (`-N`), une chauffe, médiane exportée en JSON.
 * @param {{ names: string[], runs: number, exportJson: string }} options
 */
export const hyperfineArgs = ({ names, runs, exportJson }) => {
  const unknown = names.filter((name) => !(name in BENCH_COMMANDS));
  if (unknown.length > 0) throw new Error(`bench : commande inconnue ${unknown.join(', ')}`);
  return [
    '-N',
    '--warmup',
    '1',
    '--runs',
    String(runs),
    '--export-json',
    exportJson,
    ...names.flatMap((name) => ['-n', name, BENCH_COMMANDS[name]]),
  ];
};
