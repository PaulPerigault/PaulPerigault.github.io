import { FileSystem, Path } from '@effect/platform';
import { Context, Effect, Layer, ParseResult, Schema } from 'effect';
import { Certification } from '@/domain/certification';
import { ContentInvalid, ContentNotFound, type ContentError } from '@/domain/errors';
import { Experience } from '@/domain/experience';
import { Formation } from '@/domain/formation';
import type { Lang } from '@/domain/lang';
import { ProjectsConfig } from '@/domain/project';
import { SkillCategory } from '@/domain/skill';
import { BuildConfig } from './build-config';

type Read<A> = (lang: Lang) => Effect.Effect<A, ContentError>;

export interface ContentRepositoryShape {
  readonly skills: Read<ReadonlyArray<SkillCategory>>;
  readonly experience: Read<ReadonlyArray<Experience>>;
  readonly formation: Read<ReadonlyArray<Formation>>;
  readonly certifications: Read<ReadonlyArray<Certification>>;
  readonly projectsConfig: Read<ProjectsConfig>;
}

/** Accès au contenu bilingue : lecture + validation par Schema, erreurs typées. */
export class ContentRepository extends Context.Tag('ContentRepository')<
  ContentRepository,
  ContentRepositoryShape
>() {
  static readonly Live = Layer.effect(
    ContentRepository,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const { contentDir } = yield* BuildConfig;

      const read =
        <A, I>(name: string, schema: Schema.Schema<A, I>): Read<A> =>
        (lang) =>
          fs.readFileString(path.join(contentDir, lang, `${name}.json`)).pipe(
            Effect.mapError(() => new ContentNotFound({ lang, name })),
            Effect.flatMap(Schema.decodeUnknown(Schema.parseJson(schema))),
            Effect.mapError((error) =>
              error instanceof ContentNotFound
                ? error
                : new ContentInvalid({
                    lang,
                    name,
                    issues: ParseResult.TreeFormatter.formatErrorSync(error),
                  }),
            ),
          );

      return {
        skills: read('skills', Schema.Array(SkillCategory)),
        experience: read('experience', Schema.Array(Experience)),
        formation: read('formation', Schema.Array(Formation)),
        certifications: read('certifications', Schema.Array(Certification)),
        projectsConfig: read('projects-config', ProjectsConfig),
      };
    }),
  );
}
