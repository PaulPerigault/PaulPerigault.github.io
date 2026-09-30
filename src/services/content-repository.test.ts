import { describe, expect, it } from '@effect/vitest';
import { Effect, Either } from 'effect';
import { contentRepositoryWith } from '@/test/content-fixtures';
import { ContentRepository } from './content-repository';

const skills = JSON.stringify([{ category: 'Cloud', icon: 'cloud', items: ['Docker'] }]);
const badExperience = JSON.stringify([
  {
    id: 'a',
    company: 'c',
    role: 'r',
    location: 'l',
    dateStart: '2024-13',
    dateEnd: null,
    description: 'd',
    tags: [],
  },
]);

describe('ContentRepository', () => {
  it.effect('décode un fichier valide', () =>
    Effect.gen(function* () {
      const repo = yield* ContentRepository;
      const result = yield* repo.skills('fr');
      expect(result).toEqual([{ category: 'Cloud', icon: 'cloud', items: ['Docker'] }]);
    }).pipe(Effect.provide(contentRepositoryWith({ 'content/fr/skills.json': skills }))),
  );

  it.effect('échoue avec ContentNotFound si la langue est absente', () =>
    Effect.gen(function* () {
      const repo = yield* ContentRepository;
      const result = yield* Effect.either(repo.skills('en'));
      expect(Either.isLeft(result) && result.left._tag).toBe('ContentNotFound');
    }).pipe(Effect.provide(contentRepositoryWith({ 'content/fr/skills.json': skills }))),
  );

  it.effect('échoue avec ContentInvalid et localise le champ fautif', () =>
    Effect.gen(function* () {
      const repo = yield* ContentRepository;
      const result = yield* Effect.either(repo.experience('fr'));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result) && result.left._tag === 'ContentInvalid') {
        expect(result.left.issues).toContain('dateStart');
      }
    }).pipe(Effect.provide(contentRepositoryWith({ 'content/fr/experience.json': badExperience }))),
  );

  it.effect('échoue avec ContentInvalid sur un JSON mal formé', () =>
    Effect.gen(function* () {
      const repo = yield* ContentRepository;
      const result = yield* Effect.either(repo.formation('fr'));
      expect(Either.isLeft(result) && result.left._tag).toBe('ContentInvalid');
    }).pipe(Effect.provide(contentRepositoryWith({ 'content/fr/formation.json': '{oops' }))),
  );
});
