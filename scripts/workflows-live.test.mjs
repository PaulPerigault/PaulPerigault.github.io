// Contrôle planifié de la production (#208).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('workflow live.yml', () => {
  it('lance check:live chaque semaine, en lecture seule', () => {
    const workflow = readFileSync('.github/workflows/live.yml', 'utf8');
    expect(workflow).toMatch(/schedule:\n\s+- cron: '\d+ \d+ \* \* 1'/);
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(workflow).toContain('run: npm run check:live');
  });
});
