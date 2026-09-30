import { Effect } from 'effect';
import type { Lang } from '@/domain/lang';
import { ContentRepository } from './content-repository';

/** Tout le contenu d'une langue, validé : une erreur typée fait échouer le build. */
export const loadPortfolio = (lang: Lang) =>
  Effect.gen(function* () {
    const content = yield* ContentRepository;
    return yield* Effect.all(
      {
        skills: content.skills(lang),
        experience: content.experience(lang),
        formation: content.formation(lang),
        certifications: content.certifications(lang),
        projectsConfig: content.projectsConfig(lang),
        legal: content.legal(lang),
      },
      { concurrency: 'unbounded' },
    );
  }).pipe(Effect.withSpan('loadPortfolio', { attributes: { lang } }));
