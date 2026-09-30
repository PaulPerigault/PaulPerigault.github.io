import { HttpClient, HttpClientResponse } from '@effect/platform';
import { Effect, Layer, Option, Redacted } from 'effect';
import { BuildConfig } from '@/services/build-config';
import { GithubClient } from '@/services/github-client';

export interface FakeGithub {
  readonly layer: Layer.Layer<GithubClient>;
  readonly requests: Request[];
}

/** Client GitHub adossé à un `HttpClient` simulé : `respond` reçoit le n° de tentative (1-based). */
export const fakeGithub = (respond: (attempt: number) => Response, token?: string): FakeGithub => {
  const requests: Request[] = [];
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      requests.push(new Request(request.url, { headers: request.headers }));
      return HttpClientResponse.fromWeb(request, respond(requests.length));
    }),
  );
  const config = BuildConfig.layerTest({
    githubToken: token === undefined ? Option.none() : Option.some(Redacted.make(token)),
  });
  const layer = GithubClient.Live.pipe(
    Layer.provide(Layer.mergeAll(Layer.succeed(HttpClient.HttpClient, http), config)),
  );
  return { layer, requests };
};

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const repoBody = {
  id: 1,
  name: 'demo',
  description: null,
  html_url: 'https://github.com/tester/demo',
  homepage: null,
  topics: ['go'],
  language: 'Go',
  stargazers_count: 3,
  updated_at: '2026-09-01T00:00:00Z',
  extra_field_ignored: true,
};
