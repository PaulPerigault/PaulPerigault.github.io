import { describe, expect, it } from 'vitest';
import { BENCH_COMMANDS, hyperfineArgs } from './lib/bench.mjs';

describe('hyperfineArgs', () => {
  it('mesure sans shell, avec une chauffe et un export JSON', () => {
    const args = hyperfineArgs({ names: ['lint'], runs: 5, exportJson: 'out.json' });
    expect(args).toEqual([
      '-N',
      '--warmup',
      '1',
      '--runs',
      '5',
      '--export-json',
      'out.json',
      '-n',
      'lint',
      BENCH_COMMANDS.lint,
    ]);
  });

  it('refuse une commande inconnue plutôt que de mesurer autre chose', () => {
    expect(() => hyperfineArgs({ names: ['lnit'], runs: 1, exportJson: 'x' })).toThrow(/lnit/);
  });

  it('appelle chaque outil directement, jamais par npm run', () => {
    for (const command of Object.values(BENCH_COMMANDS)) expect(command).not.toMatch(/npm run/);
  });
});
