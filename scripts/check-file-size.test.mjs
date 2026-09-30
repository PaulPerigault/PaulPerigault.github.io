import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_FILE_LINES, countLines, run } from './check-file-size.mjs';

const lines = (n) => `${'x\n'.repeat(n)}`;

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'size-'));
  mkdirSync(join(root, 'src'));
  for (const [name, count] of Object.entries(files)) {
    writeFileSync(join(root, 'src', name), lines(count));
  }
  return root;
}

describe('check-file-size', () => {
  it('compte les lignes avec ou sans retour final', () => {
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('a\nb')).toBe(2);
  });

  it('accepte un fichier à la limite', () => {
    expect(run(fixture({ 'ok.ts': MAX_FILE_LINES }))).toEqual([]);
  });

  it('refuse un fichier de limite + 1 lignes', () => {
    const root = fixture({ 'big.ts': MAX_FILE_LINES + 1, 'ok.ts': 3 });
    const offenders = run(root);
    expect(offenders).toHaveLength(1);
    expect(offenders[0]?.file).toContain('big.ts');
  });

  it('ignore les extensions non contrôlées', () => {
    expect(run(fixture({ 'data.json': MAX_FILE_LINES * 2 }))).toEqual([]);
  });
});
