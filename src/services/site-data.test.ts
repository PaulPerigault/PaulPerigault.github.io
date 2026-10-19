import { beforeEach, describe, expect, it, vi } from 'vitest';

// Le chargement réel (fichiers, GitHub) est remplacé : seul le cache par langue est testé ici.
const runBuild = vi.fn(() => Promise.resolve({ lang: 'loaded' }));
vi.mock('./runtime', () => ({ runBuild }));

const { getSiteData } = await import('./site-data');

describe('getSiteData', () => {
  beforeEach(() => runBuild.mockClear());

  it('charge chaque langue une seule fois par build et renvoie la même promesse', async () => {
    const first = getSiteData('fr');
    const second = getSiteData('fr');
    expect(second).toBe(first);
    await expect(first).resolves.toEqual({ lang: 'loaded' });
    expect(runBuild).toHaveBeenCalledTimes(1);
  });

  it('garde un cache distinct par langue', () => {
    expect(getSiteData('en')).not.toBe(getSiteData('fr'));
    expect(runBuild).toHaveBeenCalledTimes(1);
  });
});
