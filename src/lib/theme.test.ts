import { describe, expect, it } from 'vitest';
import { nextTheme, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('privilégie le choix explicite du visiteur', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('retombe sur la préférence système sans choix ou avec une valeur invalide', () => {
    expect(resolveTheme(undefined, true)).toBe('dark');
    expect(resolveTheme('sepia', false)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('bascule entre clair et sombre', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });
});
