import { describe, expect, it } from 'vitest';
import { THEME_INIT_SCRIPT } from './theme-init';

const run = (storage: Pick<Storage, 'getItem'>) => {
  const root = { dataset: {} as Record<string, string> };
  new Function('localStorage', 'document', THEME_INIT_SCRIPT)(storage, {
    documentElement: root,
  });
  return root.dataset['theme'];
};

describe('THEME_INIT_SCRIPT', () => {
  it.each(['light', 'dark'])('applique le thème stocké %s', (theme) => {
    expect(run({ getItem: () => theme })).toBe(theme);
  });

  it.each([null, '', 'sepia', 'DARK'])('ignore la valeur %s', (value) => {
    expect(run({ getItem: () => value })).toBeUndefined();
  });

  it('ne casse pas quand le stockage est inaccessible', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(run(blocked)).toBeUndefined();
  });
});
