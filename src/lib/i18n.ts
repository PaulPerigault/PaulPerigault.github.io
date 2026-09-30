import type { Lang } from '@/domain/lang';
import en from '@/content/en/ui.json';
import fr from '@/content/fr/ui.json';

type Dictionary = typeof fr;

/** Clés pointées (`nav.about`) dérivées du dictionnaire FR : une clé inconnue ne compile pas. */
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type UiKey = Paths<Dictionary>;

// `satisfies` : le dictionnaire EN doit avoir exactement la forme du dictionnaire FR.
const dictionaries = { fr, en } satisfies Record<Lang, Dictionary>;

const lookup = (dictionary: Dictionary, key: UiKey): string =>
  key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dictionary) as string;

/** Traducteur lié à une langue : `const t = useTranslations('en'); t('nav.about')`. */
export const useTranslations =
  (lang: Lang) =>
  (key: UiKey): string =>
    lookup(dictionaries[lang], key);

export const dictionaryKeys = (lang: Lang): string[] => {
  const walk = (node: unknown, prefix: string): string[] =>
    typeof node === 'string'
      ? [prefix]
      : Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
          walk(value, prefix ? `${prefix}.${key}` : key),
        );
  return walk(dictionaries[lang], '');
};
