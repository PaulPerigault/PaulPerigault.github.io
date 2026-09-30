import { describe, expect, it } from 'vitest';
import type { Project } from '@/domain/project';
import { MAX_TOPICS, newestUpdatedFirst, toYearMonth, visibleTopics } from './projects';

const project = (name: string, updated_at: string) => ({ name, updated_at }) as Project;

describe('projects', () => {
  it('trie par mise à jour décroissante sans muter la source', () => {
    const source = [project('a', '2025-01-01T00:00:00Z'), project('b', '2026-01-01T00:00:00Z')];
    expect(newestUpdatedFirst(source).map((p) => p.name)).toEqual(['b', 'a']);
    expect(source.map((p) => p.name)).toEqual(['a', 'b']);
  });

  it('limite les thèmes affichés', () => {
    const topics = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(visibleTopics(topics)).toHaveLength(MAX_TOPICS);
    expect(visibleTopics(['x'])).toEqual(['x']);
  });

  it('extrait le mois d’une date ISO', () => {
    expect(toYearMonth('2026-09-01T12:00:00Z')).toBe('2026-09');
  });
});
