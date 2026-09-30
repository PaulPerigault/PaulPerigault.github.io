import { FetchHttpClient } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import type { Effect } from 'effect';
import { Layer, ManagedRuntime } from 'effect';
import { BuildConfig } from './build-config';
import { ContentRepository } from './content-repository';
import { GithubClient } from './github-client';

const Infrastructure = Layer.mergeAll(NodeContext.layer, FetchHttpClient.layer, BuildConfig.Live);

const AppLayer = Layer.mergeAll(ContentRepository.Live, GithubClient.Live).pipe(
  Layer.provide(Infrastructure),
);

const runtime = ManagedRuntime.make(AppLayer);

/**
 * Seul pont Effect → Promise : à appeler depuis le frontmatter des pages Astro.
 * Une erreur typée fait échouer le build avec son message explicite.
 */
export const runBuild = <A, E>(
  effect: Effect.Effect<A, E, ManagedRuntime.ManagedRuntime.Context<typeof runtime>>,
): Promise<A> => runtime.runPromise(effect);
