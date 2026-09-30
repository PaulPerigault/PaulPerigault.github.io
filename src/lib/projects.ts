import type { Project } from '@/domain/project';

export const MAX_TOPICS = 4;

/** Dépôts les plus récemment mis à jour d'abord. */
export const newestUpdatedFirst = (projects: readonly Project[]): Project[] =>
  [...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

export const visibleTopics = (topics: readonly string[]): readonly string[] =>
  topics.slice(0, MAX_TOPICS);

/** `2026-09-01T00:00:00Z` → `2026-09` (entrée de `formatYearMonth`). */
export const toYearMonth = (isoDate: string): string => isoDate.slice(0, 'YYYY-MM'.length);
