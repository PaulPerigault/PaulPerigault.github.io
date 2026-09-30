import { FileSystem, Path } from '@effect/platform';
import { SystemError } from '@effect/platform/Error';
import { Effect, Layer } from 'effect';
import { BuildConfig } from '@/services/build-config';
import { ContentRepository } from '@/services/content-repository';

/** Dépôt de contenu adossé à un système de fichiers en mémoire (chemin → contenu). */
export const contentRepositoryWith = (files: Readonly<Record<string, string>>) => {
  const fileSystem = FileSystem.layerNoop({
    readFileString: (path) =>
      path in files
        ? Effect.succeed(files[path] as string)
        : Effect.fail(
            new SystemError({
              reason: 'NotFound',
              module: 'FileSystem',
              method: 'readFileString',
              pathOrDescriptor: path,
            }),
          ),
  });
  return ContentRepository.Live.pipe(
    Layer.provide(Layer.mergeAll(fileSystem, Path.layer, BuildConfig.layerTest())),
  );
};
