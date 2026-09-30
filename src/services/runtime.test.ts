import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { ContentRepository } from './content-repository';
import { GithubClient } from './github-client';
import { runBuild } from './runtime';

describe('runBuild', () => {
  it('construit le runtime réel et fournit les deux services', async () => {
    const services = await runBuild(
      Effect.all({ content: ContentRepository, github: GithubClient }),
    );
    expect(typeof services.content.skills).toBe('function');
    expect(typeof services.github.repo).toBe('function');
  });
});
