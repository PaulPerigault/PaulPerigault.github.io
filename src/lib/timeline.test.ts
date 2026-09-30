import { describe, expect, it } from 'vitest';
import type { Experience } from '@/domain/experience';
import type { Formation } from '@/domain/formation';
import { experienceEntries, formationEntries } from './timeline';

// Les valeurs de test satisfont les Schemas ; le brand YearMonth n'existe qu'au décodage.
const experience = [
  {
    id: 'old',
    company: 'Asso',
    role: 'Bénévole',
    location: 'Bezons',
    dateStart: '2022-01',
    dateEnd: '2022-12',
    description: 'd1',
    tags: ['x'],
  },
  {
    id: 'now',
    company: 'WeVii',
    role: 'Apprenti',
    location: 'Bordeaux',
    dateStart: '2023-09',
    dateEnd: null,
    description: 'd2',
    tags: [],
  },
] as unknown as Experience[];

const formation = [
  {
    id: 'iut',
    school: 'IUT',
    degree: 'BUT',
    speciality: 'Sécurité',
    dateStart: '2022-09',
    dateEnd: '2024-06',
    description: 'd3',
  },
  {
    id: 'esiea',
    school: 'ESIEA',
    degree: 'Cycle',
    speciality: 'DevOps',
    dateStart: '2024-09',
    dateEnd: '2027-08',
    description: 'd4',
  },
] as unknown as Formation[];

describe('experienceEntries', () => {
  const entries = experienceEntries(experience, 'en', 'Present');

  it('trie du plus récent au plus ancien', () => {
    expect(entries.map((entry) => entry.id)).toEqual(['now', 'old']);
  });

  it('compose titre, sous-titre, période localisée et date machine', () => {
    expect(entries[0]).toMatchObject({
      title: 'Apprenti',
      subtitle: 'WeVii · Bordeaux',
      period: 'Sep 2023 — Present',
      dateTime: '2023-09',
    });
  });

  it('conserve les étiquettes', () => {
    expect(entries[1]?.tags).toEqual(['x']);
  });
});

describe('formationEntries', () => {
  it('utilise le diplôme comme titre, école et spécialité comme sous-titre', () => {
    const entries = formationEntries(formation, 'fr', 'Présent');
    expect(entries.map((entry) => entry.id)).toEqual(['esiea', 'iut']);
    expect(entries[0]).toMatchObject({
      title: 'Cycle',
      subtitle: 'ESIEA · DevOps',
      period: 'sept. 2024 — août 2027',
    });
    expect(entries[0]?.tags).toEqual([]);
  });
});
