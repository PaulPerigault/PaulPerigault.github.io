import { beforeAll, describe, expect, it } from 'vitest';
import { loadPortfolio } from './portfolio';
import { runBuild } from './runtime';

const load = (lang: 'fr' | 'en') => runBuild(loadPortfolio(lang));
type Portfolio = Awaited<ReturnType<typeof load>>;

const FRENCH_ACCENTS = /[éèêëàâçùûôîï]/i;
// Noms propres conservés tels quels dans les deux langues.
const PROPER_NOUNS = /École 42/g;

let fr: Portfolio;
let en: Portfolio;

beforeAll(async () => {
  [fr, en] = await Promise.all([load('fr'), load('en')]);
});

describe('contenu réel FR/EN', () => {
  it('valide les deux langues avec les schémas', () => {
    expect(fr.skills.length).toBeGreaterThan(0);
    expect(en.skills.length).toBe(fr.skills.length);
  });

  it('garde la même structure (ids, dates, icônes, tailles de listes)', () => {
    expect(en.skills.map((c) => [c.icon, c.items.length])).toEqual(
      fr.skills.map((c) => [c.icon, c.items.length]),
    );
    const key = (e: { id: string; dateStart: string }) => [e.id, e.dateStart];
    expect(en.experience.map(key)).toEqual(fr.experience.map(key));
    expect(en.formation.map(key)).toEqual(fr.formation.map(key));
    expect(en.certifications.map((c) => c.id)).toEqual(fr.certifications.map((c) => c.id));
    expect(en.projectsConfig).toEqual(fr.projectsConfig);
  });

  it('traduit réellement les textes (descriptions différentes)', () => {
    fr.experience.forEach((e, i) => expect(en.experience[i]?.description).not.toBe(e.description));
    fr.formation.forEach((f, i) => expect(en.formation[i]?.description).not.toBe(f.description));
  });

  it("n'a aucun accent français dans les textes EN (hors noms propres)", () => {
    const texts = [
      ...en.skills.flatMap((c) => [c.category, ...c.items]),
      ...en.experience.flatMap((e) => [e.role, e.location, e.description, ...e.tags]),
      ...en.formation.flatMap((f) => [f.degree, f.speciality, f.description]),
    ].map((text) => text.replace(PROPER_NOUNS, ''));
    expect(texts.filter((text) => FRENCH_ACCENTS.test(text))).toEqual([]);
  });
});
