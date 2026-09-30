import { beforeAll, describe, expect, it } from 'vitest';
import type { ProjectsSnapshot } from '@/domain/project';
import { loadPortfolio } from '@/services/portfolio';
import { runBuild } from '@/services/runtime';
import { llmsFull, llmsIndex } from './llms';
import { profileMarkdown, type ProfileData } from './profile-markdown';

const snapshot = (names: string[]): ProjectsSnapshot => ({
  fetchedAt: '2026-09-30T00:00:00.000Z',
  projects: names.map((name, id) => ({
    id,
    name,
    description: 'Outil de démonstration',
    html_url: `https://github.com/PaulPerigault/${name}`,
    homepage: null,
    topics: ['go', 'gcp'],
    language: 'Go',
    stargazers_count: 0,
    updated_at: '2026-09-01T00:00:00Z',
  })),
});

const profile = async (lang: 'fr' | 'en', names: string[]): Promise<ProfileData> => ({
  lang,
  ...(await runBuild(loadPortfolio(lang))),
  projects: snapshot(names),
});

let fr: string;
let en: string;
let content: Awaited<ReturnType<typeof profile>>;

beforeAll(async () => {
  content = await profile('fr', ['GetUrlCloudRun']);
  fr = profileMarkdown(content);
  en = profileMarkdown(await profile('en', []));
});

describe('profileMarkdown', () => {
  it("énonce l'entité en tête : nom, métier, employeur, école", () => {
    expect(fr.split('\n')[0]).toBe('# Paul Perigault — Alternant DevOps Cloud');
    expect(fr).toContain('> Je suis Paul Perigault, alternant DevOps Cloud chez WeVii');
    expect(fr).toContain('ESIEA Paris');
  });

  it('reprend toutes les données : compétences, expériences, formations, certifications', () => {
    for (const category of content.skills) expect(fr).toContain(category.category);
    for (const item of content.experience) expect(fr).toContain(item.company);
    for (const item of content.formation) expect(fr).toContain(item.school);
    for (const item of content.certifications) expect(fr).toContain(item.name);
  });

  it('sépare chaque entrée par une ligne vide (Markdown valide)', () => {
    expect(fr).not.toMatch(/[^\n]\n### /);
  });

  it('liste les projets avec lien, et omet la section sans projet', () => {
    expect(fr).toContain('[GetUrlCloudRun](https://github.com/PaulPerigault/GetUrlCloudRun)');
    expect(en).not.toContain('## Projects');
  });

  it('localise dates, statuts et typographie', () => {
    expect(fr).toContain('*sept. 2023 — Présent*');
    expect(fr).toContain('(En cours)');
    expect(en).toContain('*Sep 2023 — Present*');
    expect(en).toContain('- Email: contact@paulperigault.fr');
    expect(fr).toContain('- E-mail : contact@paulperigault.fr');
  });
});

describe('llms', () => {
  const index = llmsIndex();

  it('suit la convention llmstxt.org : H1, un seul blockquote, sections, Optional', () => {
    expect(index.startsWith('# Paul Perigault\n\n> ')).toBe(true);
    expect(index.match(/^> /gm)).toHaveLength(2);
    expect(index).toContain('\n## Optional\n');
  });

  it('lie les deux langues, les profils Markdown et le texte intégral en URLs absolues', () => {
    for (const path of ['/fr/', '/en/', '/fr/index.md', '/en/index.md', '/llms-full.txt']) {
      expect(index).toContain(`](https://paulperigault.fr${path})`);
    }
  });

  it('llms-full contient les deux profils', async () => {
    const both = llmsFull([content, await profile('en', [])]);
    expect(both).toContain('# Paul Perigault — Alternant DevOps Cloud');
    expect(both).toContain('# Paul Perigault — Cloud DevOps Apprentice');
  });
});
