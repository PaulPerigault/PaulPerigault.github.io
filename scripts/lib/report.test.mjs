import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportAndExit } from './report.mjs';

const spies = () => ({
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  exit: vi.spyOn(process, 'exit').mockImplementation(() => undefined),
});

afterEach(() => vi.restoreAllMocks());

describe('reportAndExit', () => {
  it('affiche « <nom>: OK » sans problème', () => {
    const { error, log, exit } = spies();
    reportAndExit('check-x', []);
    expect(error).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('check-x: OK');
  });

  it('accepte un message de succès personnalisé', () => {
    const { log } = spies();
    reportAndExit('check-x', [], 'check-x: OK (détail)');
    expect(log).toHaveBeenCalledWith('check-x: OK (détail)');
  });

  it('écrit chaque problème sur stderr et sort en 1', () => {
    const { error, exit } = spies();
    reportAndExit('check-x', ['a', 'b']);
    expect(error.mock.calls).toEqual([['a'], ['b']]);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
