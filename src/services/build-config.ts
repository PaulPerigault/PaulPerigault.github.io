import type { Redacted } from 'effect';
import { SITE } from '@/config/site';
import { Config, Context, Effect, Layer, Option } from 'effect';

export interface BuildConfigShape {
  readonly githubUser: string;
  readonly githubApiUrl: string;
  readonly githubToken: Option.Option<Redacted.Redacted>;
  readonly contentDir: string;
  /** Vrai (CI) : un dépôt GitHub introuvable fait échouer le build ; faux (dev) : repli journalisé. */
  readonly strictData: boolean;
}

/** Configuration d'exécution du build (variables d'environnement), jamais lue ailleurs. */
export class BuildConfig extends Context.Tag('BuildConfig')<BuildConfig, BuildConfigShape>() {
  static readonly Live = Layer.effect(
    BuildConfig,
    Effect.gen(function* () {
      return {
        githubUser: yield* Config.string('GITHUB_USER').pipe(Config.withDefault(SITE.githubUser)),
        githubApiUrl: yield* Config.string('GITHUB_API_URL').pipe(
          Config.withDefault(SITE.githubApiUrl),
        ),
        githubToken: yield* Config.option(Config.redacted('GITHUB_TOKEN')),
        contentDir: yield* Config.string('CONTENT_DIR').pipe(Config.withDefault('src/content')),
        strictData: yield* Config.boolean('STRICT_DATA').pipe(
          Config.orElse(() => Config.boolean('CI')),
          Config.withDefault(false),
        ),
      };
    }),
  );

  static layerTest(overrides: Partial<BuildConfigShape> = {}) {
    return Layer.succeed(BuildConfig, {
      githubUser: 'tester',
      githubApiUrl: SITE.githubApiUrl,
      githubToken: Option.none(),
      contentDir: 'content',
      strictData: false,
      ...overrides,
    });
  }
}
