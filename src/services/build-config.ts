import type { Redacted } from 'effect';
import { Config, Context, Effect, Layer, Option } from 'effect';

export interface BuildConfigShape {
  readonly githubUser: string;
  readonly githubApiUrl: string;
  readonly githubToken: Option.Option<Redacted.Redacted>;
  readonly contentDir: string;
}

/** Configuration d'exécution du build (variables d'environnement), jamais lue ailleurs. */
export class BuildConfig extends Context.Tag('BuildConfig')<BuildConfig, BuildConfigShape>() {
  static readonly Live = Layer.effect(
    BuildConfig,
    Effect.gen(function* () {
      return {
        githubUser: yield* Config.string('GITHUB_USER').pipe(Config.withDefault('PaulPerigault')),
        githubApiUrl: yield* Config.string('GITHUB_API_URL').pipe(
          Config.withDefault('https://api.github.com'),
        ),
        githubToken: yield* Config.option(Config.redacted('GITHUB_TOKEN')),
        contentDir: yield* Config.string('CONTENT_DIR').pipe(Config.withDefault('src/content')),
      };
    }),
  );

  static layerTest(overrides: Partial<BuildConfigShape> = {}) {
    return Layer.succeed(BuildConfig, {
      githubUser: 'tester',
      githubApiUrl: 'https://api.test',
      githubToken: Option.none(),
      contentDir: 'content',
      ...overrides,
    });
  }
}
