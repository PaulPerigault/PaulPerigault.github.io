import { describe, expect, it } from '@effect/vitest';
import { Effect, Either, Fiber, TestClock } from 'effect';
import { fakeGithub, jsonResponse, repoBody } from '@/test/github-http';
import { GithubClient } from './github-client';

const fetchRepo = Effect.flatMap(GithubClient, (client) => client.repo('demo'));

/** Lance la requête et avance l'horloge de test assez loin pour épuiser retries et timeouts. */
const settle = <A, E>(effect: Effect.Effect<A, E, GithubClient>) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.fork(effect);
    yield* TestClock.adjust('1 minute');
    return yield* Fiber.join(fiber);
  });

describe('GithubClient', () => {
  it.effect('décode le dépôt et ignore les champs inconnus', () => {
    const { layer, requests } = fakeGithub(() => jsonResponse(repoBody));
    return Effect.gen(function* () {
      const project = yield* fetchRepo;
      expect(project.name).toBe('demo');
      expect(requests[0]?.url).toBe('https://api.test/repos/tester/demo');
    }).pipe(Effect.provide(layer));
  });

  it.effect('envoie le jeton en Bearer quand il est configuré', () => {
    const { layer, requests } = fakeGithub(() => jsonResponse(repoBody), 's3cret');
    return Effect.gen(function* () {
      yield* fetchRepo;
      expect(requests[0]?.headers.get('authorization')).toBe('Bearer s3cret');
    }).pipe(Effect.provide(layer));
  });

  it.effect('ne réessaie pas un 404', () => {
    const { layer, requests } = fakeGithub(() => jsonResponse({}, 404));
    return Effect.gen(function* () {
      const result = yield* Effect.either(settle(fetchRepo));
      expect(Either.isLeft(result) && result.left.status).toBe(404);
      expect(requests).toHaveLength(1);
    }).pipe(Effect.provide(layer));
  });

  it.effect('réessaie un 503 puis réussit', () => {
    const { layer, requests } = fakeGithub((attempt) =>
      attempt < 3 ? jsonResponse({}, 503) : jsonResponse(repoBody),
    );
    return Effect.gen(function* () {
      const project = yield* settle(fetchRepo);
      expect(project.name).toBe('demo');
      expect(requests).toHaveLength(3);
    }).pipe(Effect.provide(layer));
  });

  it.effect('échoue avec GithubUnavailable après 4 tentatives sur 503', () => {
    const { layer, requests } = fakeGithub(() => jsonResponse({}, 503));
    return Effect.gen(function* () {
      const result = yield* Effect.either(settle(fetchRepo));
      expect(Either.isLeft(result) && result.left._tag).toBe('GithubUnavailable');
      expect(requests).toHaveLength(4);
    }).pipe(Effect.provide(layer));
  });

  it.effect('signale une réponse inattendue', () => {
    const { layer } = fakeGithub(() => jsonResponse({ name: 42 }));
    return Effect.gen(function* () {
      const result = yield* Effect.either(settle(fetchRepo));
      expect(Either.isLeft(result) && result.left.reason).toBe('réponse inattendue');
    }).pipe(Effect.provide(layer));
  });
});
