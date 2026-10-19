// Hébergement : plus de Docker ni de nginx (ADR-0008) ; les en-têtes vivent dans public/_headers.
// Plus aucun script shell : tout l'outillage est en Node, identique sous Windows, macOS et Linux.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withoutGitEnv } from './lib/git-env.mjs';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', env: withoutGitEnv() })
  .split('\n')
  .filter(Boolean);

describe('hébergement sans Docker', () => {
  it('ne suit plus aucun fichier Docker, nginx ou script shell', () => {
    const leftovers = tracked.filter((file) =>
      /(?:^|\/)(?:Dockerfile|docker-compose\.ya?ml|\.dockerignore|nginx\.conf)$|\.sh$/.test(file),
    );
    expect(leftovers).toEqual([]);
  });

  it('ne demande plus de mises à jour d’images Docker et publie les en-têtes avec le site', () => {
    expect(readFileSync('.github/dependabot.yml', 'utf8')).not.toContain(
      'package-ecosystem: docker',
    );
    expect(existsSync('public/_headers')).toBe(true);
  });
});
