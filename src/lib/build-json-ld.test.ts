import { describe, expect, it } from 'vitest';
import type { Certification } from '@/domain/certification';
import { buildJsonLd, serializeJsonLd } from './build-json-ld';
import type { JsonLdInput } from './json-ld';

const certification = {
  id: 'gcp-cdl',
  name: 'Cloud Digital Leader',
  issuer: 'Google Cloud',
  dateIssued: '2024-11',
} as Certification;

const input: JsonLdInput = {
  lang: 'fr',
  path: '/fr/',
  title: 'Paul Perigault — Ingénieur DevOps',
  description: 'Portfolio',
  jobTitle: 'Ingénieur DevOps',
  imageUrl: 'https://paulperigault.fr/_astro/photo.webp',
  skills: ['Docker', 'Terraform'],
  certifications: [certification],
  projectNames: ['GetUrlCloudRun'],
};

type Node = Record<string, unknown>;
const nodes = (data: ReturnType<typeof buildJsonLd>) => data['@graph'] as Node[];
const types = (data: ReturnType<typeof buildJsonLd>) => nodes(data).map((node) => node['@type']);

const collectRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(collectRefs);
  if (value === null || typeof value !== 'object') return [];
  const entries = Object.entries(value);
  const own = entries.length === 1 && entries[0]?.[0] === '@id' ? [String(entries[0][1])] : [];
  return [...own, ...entries.flatMap(([, child]) => collectRefs(child))];
};

const definedIds = (data: ReturnType<typeof buildJsonLd>): string[] => {
  const collect = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value === null || typeof value !== 'object') return [];
    const record = value as Node;
    const own = '@type' in record && typeof record['@id'] === 'string' ? [record['@id']] : [];
    return [...own, ...Object.values(record).flatMap(collect)];
  };
  return collect(nodes(data));
};

describe('buildJsonLd', () => {
  const data = buildJsonLd(input);

  it('contient Person, WebSite, ProfilePage et les deux listes', () => {
    expect(types(data)).toEqual(['Person', 'WebSite', 'ProfilePage', 'ItemList', 'ItemList']);
  });

  it('décrit la personne à partir de la config du site', () => {
    const person = nodes(data)[0] as Node;
    expect(person).toMatchObject({
      name: 'Paul Perigault',
      url: 'https://paulperigault.fr',
      jobTitle: 'Ingénieur DevOps',
      knowsAbout: ['Docker', 'Terraform'],
      sameAs: ['https://github.com/PaulPerigault', 'https://www.linkedin.com/in/paul-perigault'],
    });
  });

  it('a des identifiants uniques et toutes ses références se résolvent', () => {
    const ids = definedIds(data);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reference of collectRefs(nodes(data))) expect(ids).toContain(reference);
  });

  it('localise la page de profil', () => {
    const profile = nodes(data)[2] as Node;
    expect(profile).toMatchObject({ inLanguage: 'fr', url: 'https://paulperigault.fr/fr/' });
  });

  it('omet les listes et knowsAbout quand il n’y a pas de données', () => {
    const empty = buildJsonLd({ ...input, skills: [], certifications: [], projectNames: [] });
    expect(types(empty)).toEqual(['Person', 'WebSite', 'ProfilePage']);
    expect(nodes(empty)[0]).not.toHaveProperty('knowsAbout');
  });
});

describe('serializeJsonLd', () => {
  it('échappe < pour ne jamais fermer la balise script', () => {
    const json = serializeJsonLd({ text: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(JSON.parse(json).text).toBe('</script><script>alert(1)</script>');
  });
});
