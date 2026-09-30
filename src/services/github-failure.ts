import type { HttpClientError } from '@effect/platform';
import type { Cause } from 'effect';
import type { ParseError } from 'effect/ParseResult';
import { GithubUnavailable } from '@/domain/errors';

const SERVER_ERROR = 500;

export type GithubFailure = HttpClientError.HttpClientError | ParseError | Cause.TimeoutException;

const statusOf = (failure: GithubFailure): number | undefined =>
  failure._tag === 'ResponseError' ? failure.response.status : undefined;

/** Erreurs qui méritent un nouvel essai : réseau, timeout, 5xx. Jamais 404 ni 403 (quota). */
export const isTransient = (failure: GithubFailure): boolean => {
  const status = statusOf(failure);
  if (status !== undefined) return status >= SERVER_ERROR;
  return failure._tag === 'RequestError' || failure._tag === 'TimeoutException';
};

const reasonOf = (failure: GithubFailure): string => {
  switch (failure._tag) {
    case 'TimeoutException':
      return 'timeout';
    case 'ParseError':
      return 'réponse inattendue';
    case 'ResponseError':
      return `HTTP ${failure.response.status}`;
    default:
      return 'erreur réseau';
  }
};

export const toUnavailable = (repo: string, failure: GithubFailure): GithubUnavailable => {
  const status = statusOf(failure);
  return new GithubUnavailable({
    repo,
    reason: reasonOf(failure),
    ...(status === undefined ? {} : { status }),
  });
};
