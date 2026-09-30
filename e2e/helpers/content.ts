import { readFileSync } from 'node:fs';

export type TestLang = 'fr' | 'en';

/** Contenu source (src/content) : les tests comparent l'affichage aux données, pas à des copies. */
export const loadContent = <T>(lang: TestLang, name: string): T[] =>
  JSON.parse(readFileSync(`src/content/${lang}/${name}.json`, 'utf8')) as T[];
