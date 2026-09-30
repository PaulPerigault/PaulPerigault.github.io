import { describe, expect, it } from 'vitest';
import { HEAD_INIT_SCRIPT } from './head-init';

const run = (storage: Pick<Storage, 'getItem'>) => {
  const classes = new Set<string>();
  const root = {
    dataset: {} as Record<string, string>,
    classList: { add: (name: string) => classes.add(name) },
  };
  new Function('localStorage', 'document', HEAD_INIT_SCRIPT)(storage, { documentElement: root });
  return { theme: root.dataset['theme'], classes };
};

describe('HEAD_INIT_SCRIPT', () => {
  it.each(['light', 'dark'])('applique le thème stocké %s', (theme) => {
    expect(run({ getItem: () => theme }).theme).toBe(theme);
  });

  it.each([null, '', 'sepia', 'DARK'])('ignore la valeur %s', (value) => {
    expect(run({ getItem: () => value }).theme).toBeUndefined();
  });

  it('marque toujours <html> comme js, même si le stockage est inaccessible', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    const { theme, classes } = run(blocked);
    expect(theme).toBeUndefined();
    expect(classes.has('js')).toBe(true);
  });
});
