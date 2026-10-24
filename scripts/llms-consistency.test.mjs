import { describe, expect, it } from 'vitest';
import { llmsConsistencyProblems, PROFILE_SEPARATOR } from './lib/llms-consistency.mjs';

const ORIGIN = 'https://paulperigault.fr';
const FR = '# Paul Perigault — Alternant DevOps Cloud\n\nProfil.\n';
const EN = '# Paul Perigault — Cloud DevOps Apprentice\n\nProfile.\n';
const LLMS = [
  '# Paul Perigault',
  `- [FR](${ORIGIN}/fr/)`,
  `- [EN](${ORIGIN}/en/)`,
  `- [FR md](${ORIGIN}/fr/index.md)`,
  `- [Full](${ORIGIN}/llms-full.txt)`,
  '- [GitHub](https://github.com/PaulPerigault)',
].join('\n');
const SITEMAP = [`${ORIGIN}/fr/`, `${ORIGIN}/en/`, `${ORIGIN}/fr/legal/`];

const base = () => ({
  origin: ORIGIN,
  llms: LLMS,
  llmsFull: [FR, EN].join(PROFILE_SEPARATOR),
  profiles: [FR, EN],
  sitemapUrls: SITEMAP,
});
const problems = (override = {}) => llmsConsistencyProblems({ ...base(), ...override });

describe('cohérence llms.txt / llms-full.txt / sitemap', () => {
  it('ne signale rien quand tout concorde', () => {
    expect(problems()).toEqual([]);
  });

  it('signale un llms-full.txt périmé par rapport aux profils Markdown', () => {
    const stale = [FR, EN.replace('Profile.', 'Ancien profil.')].join(PROFILE_SEPARATOR);
    expect(problems({ llmsFull: stale })).toEqual([
      'llms-full.txt diffère des profils Markdown /<lang>/index.md (fichier périmé)',
    ]);
  });

  it('signale un llms-full.txt sans profil', () => {
    const found = problems({ llmsFull: FR, profiles: [FR, EN] });
    expect(found.some((p) => p.includes('Cloud DevOps Apprentice'))).toBe(true);
  });

  it('signale un llms.txt qui ne renvoie plus vers le texte intégral', () => {
    const llms = LLMS.replace('llms-full.txt', 'ailleurs.txt');
    expect(problems({ llms })).toContain('llms.txt ne renvoie pas vers /llms-full.txt');
  });

  it('signale une page de llms.txt absente du sitemap', () => {
    const llms = `${LLMS}\n- [Autre](${ORIGIN}/fr/autre/)`;
    expect(problems({ llms })).toEqual([`llms.txt liste ${ORIGIN}/fr/autre/, absente du sitemap`]);
  });

  it('signale une langue du sitemap absente de llms.txt', () => {
    const llms = LLMS.replace(`- [EN](${ORIGIN}/en/)\n`, '');
    expect(problems({ llms })).toEqual([`${ORIGIN}/en/ est au sitemap mais pas dans llms.txt`]);
  });

  it('ignore les liens externes et les fichiers non HTML', () => {
    expect(problems({ sitemapUrls: [`${ORIGIN}/fr/`, `${ORIGIN}/en/`] })).toEqual([]);
  });
});
