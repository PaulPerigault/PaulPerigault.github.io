import { describe, expect, it } from 'vitest';
import { isTransient, toUnavailable, type GithubFailure } from './github-failure';

// Seuls `_tag` et `response.status` sont lus : des doublures minimales suffisent.
const failure = (tag: string, status?: number) =>
  ({
    _tag: tag,
    ...(status === undefined ? {} : { response: { status } }),
  }) as unknown as GithubFailure;

describe('isTransient', () => {
  it.each([
    ['RequestError', undefined, true],
    ['TimeoutException', undefined, true],
    ['ParseError', undefined, false],
    ['ResponseError', 500, true],
    ['ResponseError', 503, true],
    ['ResponseError', 404, false],
    ['ResponseError', 403, false],
  ])('%s %s → %s', (tag, status, expected) => {
    expect(isTransient(failure(tag, status))).toBe(expected);
  });
});

describe('toUnavailable', () => {
  it.each([
    ['TimeoutException', undefined, 'timeout'],
    ['ParseError', undefined, 'réponse inattendue'],
    ['ResponseError', 502, 'HTTP 502'],
    ['RequestError', undefined, 'erreur réseau'],
  ])('%s → raison « %s »', (tag, status, reason) => {
    const error = toUnavailable('demo', failure(tag, status));
    expect(error.reason).toBe(reason);
    expect(error.repo).toBe('demo');
    expect(error.status).toBe(status);
  });
});
