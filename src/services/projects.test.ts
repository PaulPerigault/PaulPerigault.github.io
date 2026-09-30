import { describe, expect, it } from '@effect/vitest';
import { Effect, Either, Layer, TestClock } from 'effect';
import { contentRepositoryWith } from '@/test/content-fixtures';
import { fakeGithub, jsonResponse, repoBody } from '@/test/github-http';
import { BuildConfig } from './build-config';
import { loadProjects } from './projects';

const UPDATED = { old: '2025-01-01T00:00:00Z', fresh: '2026-09-01T00:00:00Z' } as const;

const respond = (_attempt: number, url: string): Response => {
  const name = url.split('/').pop() as keyof typeof UPDATED | 'gone';
  return name === 'gone'
    ? jsonResponse({ message: 'Not Found' }, 404)
    : jsonResponse({ ...repoBody, name, updated_at: UPDATED[name] });
};

const layerFor = (featured: string[], strictData: boolean) =>
  Layer.mergeAll(
    contentRepositoryWith({
      'content/fr/projects-config.json': JSON.stringify({ featured }),
    }),
    fakeGithub(respond).layer,
    BuildConfig.layerTest({ strictData }),
  );

describe('loadProjects', () => {
  it.effect('trie les dépôts du plus récemment mis à jour au plus ancien', () =>
    Effect.gen(function* () {
      const { projects } = yield* loadProjects('fr');
      expect(projects.map((project) => project.name)).toEqual(['fresh', 'old']);
    }).pipe(Effect.provide(layerFor(['old', 'fresh'], false))),
  );

  it.effect('ignore un dépôt introuvable en mode tolérant', () =>
    Effect.gen(function* () {
      const { projects } = yield* loadProjects('fr');
      expect(projects.map((project) => project.name)).toEqual(['fresh']);
    }).pipe(Effect.provide(layerFor(['gone', 'fresh'], false))),
  );

  it.effect('échoue en mode strict en nommant le dépôt et le statut HTTP', () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(loadProjects('fr'));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result) && result.left._tag === 'GithubUnavailable') {
        expect(result.left.repo).toBe('gone');
        expect(result.left.status).toBe(404);
      }
    }).pipe(Effect.provide(layerFor(['fresh', 'gone'], true))),
  );

  it.effect('horodate la récupération avec l’horloge Effect', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(Date.UTC(2026, 8, 30));
      const { fetchedAt } = yield* loadProjects('fr');
      expect(fetchedAt).toBe('2026-09-30T00:00:00.000Z');
    }).pipe(Effect.provide(layerFor(['fresh'], false))),
  );

  it.effect('renvoie une liste vide sans dépôt configuré', () =>
    Effect.gen(function* () {
      expect((yield* loadProjects('fr')).projects).toEqual([]);
    }).pipe(Effect.provide(layerFor([], true))),
  );
});
