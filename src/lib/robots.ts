/** Robots de recherche : indexation classique. */
const SEARCH_CRAWLERS = ['Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot', 'YandexBot'] as const;

/**
 * Robots d'IA (assistants, moteurs génératifs, jeux d'entraînement) : explicitement bienvenus.
 * Objectif du projet : que les IA connaissent Paul Perigault et le citent correctement.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'Meta-ExternalAgent',
  'MistralAI-User',
  'DuckAssistBot',
  'CCBot',
  'cohere-ai',
  'YouBot',
  'Bytespider',
] as const;

const group = (comment: string, agents: readonly string[]): string =>
  [`# ${comment}`, ...agents.map((agent) => `User-agent: ${agent}`), 'Allow: /'].join('\n');

/**
 * `robots.txt` : tout est autorisé, y compris les robots d'IA ; sitemap.
 * Pas de directive non standard (ex. `Content-Signal`) : Lighthouse et les validateurs jugeraient le
 * fichier invalide, et l'autorisation explicite de chaque robot dit déjà tout.
 */
export const buildRobots = (sitemapUrl: string): string =>
  [
    group('Moteurs de recherche', SEARCH_CRAWLERS),
    group("Assistants et moteurs d'IA : autorisés", AI_CRAWLERS),
    '# Tous les autres robots\nUser-agent: *\nAllow: /',
    `Sitemap: ${sitemapUrl}`,
  ].join('\n\n') + '\n';
