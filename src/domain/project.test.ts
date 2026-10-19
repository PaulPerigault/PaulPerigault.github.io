import { describe, expect, it } from '@effect/vitest';
import { Either, Schema } from 'effect';
import { Project } from './project';

const repo = {
  id: 1,
  name: 'demo',
  description: null,
  html_url: 'https://github.com/tester/demo',
  homepage: 'https://demo.example.org',
  topics: [],
  language: null,
  stargazers_count: 0,
  updated_at: '2026-09-01T00:00:00Z',
};

const decode = Schema.decodeUnknownEither(Project);
const homepageOf = (homepage: unknown) => Either.getOrThrow(decode({ ...repo, homepage })).homepage;

describe('Project : liens rendus en href', () => {
  it('garde un site https', () => {
    expect(homepageOf('https://demo.example.org')).toBe('https://demo.example.org');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'http://demo.example.org', '', '  '])(
    'écarte un site qui n’est pas en https (%j) : aucun lien plutôt qu’un build cassé',
    (homepage) => {
      expect(homepageOf(homepage)).toBeNull();
    },
  );

  it('refuse un dépôt dont l’adresse n’est pas sur https://github.com/', () => {
    expect(Either.isLeft(decode({ ...repo, html_url: 'javascript:alert(1)' }))).toBe(true);
  });
});
