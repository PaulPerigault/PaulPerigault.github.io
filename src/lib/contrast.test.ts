import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

const TOKENS = readFileSync('src/styles/tokens.css', 'utf8');
const PAIR = /--pp-([a-z-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi;

const palettes = { light: new Map<string, string>(), dark: new Map<string, string>() };
for (const [, name, light, dark] of TOKENS.matchAll(PAIR)) {
  palettes.light.set(name as string, light as string);
  palettes.dark.set(name as string, dark as string);
}

const ratio = (mode: 'light' | 'dark', foreground: string, background: string): number =>
  contrastRatio(palettes[mode].get(foreground) as string, palettes[mode].get(background) as string);

const TEXT_AA = 4.5;
const CONTROL_AA = 3;

describe('contrastRatio', () => {
  it('vaut 21 pour noir sur blanc et 1 pour deux couleurs identiques', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
  });

  it('refuse une couleur mal formée', () => {
    expect(() => contrastRatio('rouge', '#ffffff')).toThrow();
  });
});

describe.each(['light', 'dark'] as const)('tokens de couleur (%s)', (mode) => {
  it('définit toutes les couleurs', () => {
    expect([...palettes[mode].keys()].sort()).toEqual(
      ['accent', 'bg', 'control', 'fg', 'line', 'muted', 'on-accent', 'surface'].sort(),
    );
  });

  it.each([
    ['fg', 'bg', TEXT_AA],
    ['fg', 'surface', TEXT_AA],
    ['muted', 'bg', TEXT_AA],
    ['muted', 'surface', TEXT_AA],
    ['accent', 'bg', TEXT_AA],
    ['accent', 'surface', TEXT_AA],
    ['on-accent', 'accent', TEXT_AA],
    ['control', 'bg', CONTROL_AA],
  ] as const)('%s sur %s ≥ %s:1', (foreground, background, minimum) => {
    expect(ratio(mode, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});
