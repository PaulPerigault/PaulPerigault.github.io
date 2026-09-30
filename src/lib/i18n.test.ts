import { describe, expect, it } from 'vitest';
import { dictionaryKeys, useTranslations } from './i18n';

describe('i18n', () => {
  it('a exactement les mêmes clés en FR et en EN', () => {
    expect(dictionaryKeys('en').sort()).toEqual(dictionaryKeys('fr').sort());
  });

  it('ne contient aucune chaîne vide', () => {
    for (const lang of ['fr', 'en'] as const) {
      const t = useTranslations(lang);
      for (const key of dictionaryKeys(lang)) {
        expect(t(key as Parameters<typeof t>[0]).trim(), `${lang}:${key}`).not.toBe('');
      }
    }
  });

  it('traduit selon la langue', () => {
    expect(useTranslations('fr')('hero.role')).toBe('Ingénieur DevOps');
    expect(useTranslations('en')('hero.role')).toBe('DevOps Engineer');
  });

  it('refuse une clé inconnue à la compilation', () => {
    // @ts-expect-error clé absente du dictionnaire
    expect(() => useTranslations('fr')('cle.inconnue')).toThrow();
  });
});
