import { Effect } from 'effect';
import type { Lang } from '@/domain/lang';
import { loadPortfolio } from './portfolio';
import { loadProjects } from './projects';
import { runBuild } from './runtime';

const cache = new Map<Lang, ReturnType<typeof fetchSiteData>>();

const fetchSiteData = (lang: Lang) =>
  runBuild(
    Effect.all(
      { portfolio: loadPortfolio(lang), projects: loadProjects(lang) },
      { concurrency: 2 },
    ),
  );

/** Tout ce qu'une langue affiche, chargé **une seule fois** par build (pages, .md et llms-full). */
export const getSiteData = (lang: Lang) => {
  const cached = cache.get(lang);
  if (cached) return cached;
  const pending = fetchSiteData(lang);
  cache.set(lang, pending);
  return pending;
};
