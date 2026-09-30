import { describe, expect, it } from 'vitest';
import { findViolations } from './check-layers.mjs';
import { isAllowed } from './lib/layers.mjs';

const file = (path, source) => ({ path, source });

describe('couches', () => {
  it('autorise le sens normal des dépendances', () => {
    expect(isAllowed('src/services/content.ts', 'src/domain/skill.ts')).toBe(true);
    expect(isAllowed('src/components/sections/Skills.astro', 'src/components/ui/Card.astro')).toBe(
      true,
    );
    expect(isAllowed('src/pages/fr/index.astro', 'src/services/content.ts')).toBe(true);
  });

  it('interdit le domaine vers les services', () => {
    expect(isAllowed('src/domain/skill.ts', 'src/services/content.ts')).toBe(false);
  });

  it('interdit une primitive UI vers une section ou un service', () => {
    expect(isAllowed('src/components/ui/Card.astro', 'src/components/sections/Skills.astro')).toBe(
      false,
    );
    expect(isAllowed('src/components/ui/Card.astro', 'src/services/github.ts')).toBe(false);
  });

  it('ignore les imports externes', () => {
    expect(isAllowed('src/domain/skill.ts', 'effect')).toBe(true);
  });
});

describe('findViolations', () => {
  it('détecte un import par alias et un import relatif fautifs', () => {
    const violations = findViolations([
      file('src/domain/a.ts', "import { x } from '@/services/b';"),
      file('src/components/ui/Card.astro', "import S from '../sections/Skills.astro';"),
      file('src/components/ui/Tag.astro', "import { y } from '@/lib/format';"),
    ]);
    expect(violations.map((v) => v.file)).toEqual([
      'src/domain/a.ts',
      'src/components/ui/Card.astro',
    ]);
  });
});
