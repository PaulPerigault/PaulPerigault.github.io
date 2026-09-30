import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform';
import { Context, Effect, Layer, Option, Redacted, Schedule } from 'effect';
import type { GithubUnavailable } from '@/domain/errors';
import { Project } from '@/domain/project';
import { BuildConfig } from './build-config';
import { isTransient, toUnavailable } from './github-failure';

const TIMEOUT = '5 seconds';
const MAX_RETRIES = 3;
const BACKOFF = '200 millis';

export interface GithubClientShape {
  readonly repo: (name: string) => Effect.Effect<Project, GithubUnavailable>;
}

/** Client de l'API GitHub : jeton optionnel (`Redacted`), retries exponentiels, timeout. */
export class GithubClient extends Context.Tag('GithubClient')<GithubClient, GithubClientShape>() {
  static readonly Live = Layer.effect(
    GithubClient,
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient;
      const { githubUser, githubApiUrl, githubToken } = yield* BuildConfig;
      const withAuth = Option.match(githubToken, {
        onNone: () => (request: HttpClientRequest.HttpClientRequest) => request,
        onSome: (token) => HttpClientRequest.bearerToken(Redacted.value(token)),
      });

      const repo = (name: string) =>
        HttpClientRequest.get(`${githubApiUrl}/repos/${githubUser}/${name}`).pipe(
          HttpClientRequest.acceptJson,
          withAuth,
          http.execute,
          Effect.flatMap(HttpClientResponse.filterStatusOk),
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Project)),
          Effect.scoped,
          Effect.timeout(TIMEOUT),
          Effect.retry({
            schedule: Schedule.exponential(BACKOFF),
            times: MAX_RETRIES,
            while: isTransient,
          }),
          Effect.mapError((failure) => toUnavailable(name, failure)),
          Effect.withSpan('GithubClient.repo', { attributes: { repo: name } }),
        );

      return { repo };
    }),
  );
}
