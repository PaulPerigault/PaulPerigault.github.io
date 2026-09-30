import { Clock, Effect } from 'effect';
import type { Lang } from '@/domain/lang';
import type { Project, ProjectsSnapshot } from '@/domain/project';
import { newestUpdatedFirst } from '@/lib/projects';
import { BuildConfig } from './build-config';
import { ContentRepository } from './content-repository';
import { GithubClient } from './github-client';

const CONCURRENCY = 4;

/**
 * Projets « featured » depuis l'API GitHub, au build uniquement.
 * Stricte (CI) : un dépôt introuvable fait échouer le build (`GithubUnavailable`).
 * Tolérante (dev) : le dépôt est ignoré et un avertissement est journalisé.
 */
export const loadProjects = (lang: Lang) =>
  Effect.gen(function* () {
    const { featured } = yield* (yield* ContentRepository).projectsConfig(lang);
    const github = yield* GithubClient;
    const { strictData } = yield* BuildConfig;

    const fetchOne = (name: string) =>
      strictData
        ? github.repo(name)
        : github.repo(name).pipe(
            Effect.tapError((error) => Effect.logWarning(error.message)),
            Effect.orElseSucceed((): Project | null => null),
          );

    const results = yield* Effect.forEach(featured, fetchOne, { concurrency: CONCURRENCY });
    const fetchedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
    const projects = newestUpdatedFirst(results.filter((project) => project !== null));
    return { projects, fetchedAt } satisfies ProjectsSnapshot;
  }).pipe(Effect.withSpan('loadProjects', { attributes: { lang } }));
