import { describe, expect, it } from 'vitest';
import { checkFile, run } from './check-design.mjs';

const rulesOf = (file, text) => checkFile(file, text).map((violation) => violation.rule);

describe('check-design : ce qui doit échouer', () => {
  it.each([
    ['gradient', 'src/components/Hero.astro', '<div class="bg-gradient-to-r from-purple-500">'],
    ['gradient', 'src/styles/a.css', 'background: linear-gradient(red, blue);'],
    ['ombre', 'src/components/Card.astro', '<div class="shadow-lg rounded">'],
    ['ombre', 'src/styles/a.css', 'box-shadow: 0 1px 2px #000;'],
    ['flou', 'src/components/Nav.astro', '<nav class="backdrop-blur-md">'],
    ['couleur-en-dur', 'src/components/Tag.astro', '<span style="color:#ff00aa">'],
    ['couleur-en-dur', 'src/styles/a.css', 'color: rgb(1, 2, 3);'],
    ['palette-tailwind', 'src/components/Btn.astro', '<a class="bg-teal-500 text-white">'],
    ['valeur-arbitraire', 'src/components/Box.astro', '<div class="w-[13px] mt-[#fff]">'],
    ['famille-typographique', 'src/components/Meta.astro', '<p class="font-mono text-xs">'],
    ['famille-typographique', 'src/components/Title.astro', '<h1 class="font-serif">'],
    [
      'etiquette-majuscules',
      'src/components/Kicker.astro',
      '<p class="text-xs uppercase tracking-widest">',
    ],
    ['emoji', 'src/components/Nav.astro', '<span>🚀 Projets</span>'],
    ['emoji', 'src/content/fr/ui.json', '{"title": "Bienvenue ✨"}'],
    ['phrase-generique', 'src/content/fr/ui.json', '{"body": "Passionné par la technologie"}'],
    ['phrase-generique', 'src/content/en/ui.json', '{"body": "I build cutting-edge solutions"}'],
  ])('détecte « %s » dans %s', (rule, file, text) => {
    expect(rulesOf(file, text)).toContain(rule);
  });

  it('indique le fichier, la ligne et l’extrait', () => {
    const [violation] = checkFile('src/a.astro', 'ligne 1\n<div class="shadow-md">');
    expect(violation).toMatchObject({ file: 'src/a.astro', line: 2, rule: 'ombre' });
    expect(violation?.excerpt).toContain('shadow-md');
  });
});

describe('check-design : ce qui doit passer', () => {
  it.each([
    ['src/styles/tokens.css', '--pp-bg: light-dark(#f5f1e8, #14130f);'],
    ['src/lib/theme.ts', "export const THEME_COLOR = { light: '#f5f1e8' };"],
    [
      'src/components/Card.astro',
      '<div class="border-line border p-6 text-muted duration-(--pp-duration)">',
    ],
    ['src/components/Grid.astro', '<dl class="sm:grid-cols-[14rem_1fr]">'],
    ['src/content/fr/ui.json', '{"copyright": "© 2026 — Paul Perigault"}'],
    ['src/components/A.astro', '<a class="ring-accent">'],
    ['src/components/B.astro', '<a class="px-2 text-sm font-semibold uppercase">'],
  ])('accepte %s', (file, text) => {
    expect(checkFile(file, text)).toEqual([]);
  });

  it('ne signale rien dans le code source actuel', () => {
    expect(run('src')).toEqual([]);
  });
});
