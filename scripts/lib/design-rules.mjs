// Règles de la charte de design (docs/design-charter.md) : ce qui rend un site « générique ».
// Chaque règle : un nom, un motif, une explication ; `only` limite les extensions concernées.

const CODE = ['.astro', '.ts', '.css'];
const TEXT = ['.astro', '.ts', '.json'];

const PALETTE_COLORS =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/** Formules creuses fréquentes dans les textes générés : on écrit des faits, pas des slogans. */
const GENERIC_PHRASES = [
  'passionné par',
  'passionnée par',
  'passionate about',
  'cutting-edge',
  'cutting edge',
  'state-of-the-art',
  'à la pointe',
  'lorem ipsum',
  'dynamique et motivé',
  'dynamic and motivated',
  'solutions innovantes',
  'innovative solutions',
  'delve into',
  'tapestry',
  'testament to',
  'fast-paced world',
  'ever-evolving',
  "in today's",
  'game-changer',
  'synergie',
  'synergy',
];

export const RULES = [
  {
    name: 'gradient',
    message: 'Pas de dégradé décoratif.',
    pattern: /\b(?:bg-gradient|bg-linear|bg-radial|bg-conic)\b|(?:linear|radial|conic)-gradient\(/,
    only: CODE,
  },
  {
    name: 'ombre',
    message: 'Pas d’ombre décorative : les filets fins structurent la page.',
    pattern: /\b(?:drop-)?shadow(?:-[a-z0-9]+)?\b(?=[\s"'`])|box-shadow|text-shadow/,
    only: CODE,
  },
  {
    name: 'flou',
    message: 'Pas de glassmorphism (backdrop-blur / backdrop-filter).',
    pattern: /backdrop-(?:blur|filter)|\bblur-[a-z0-9]+/,
    only: CODE,
  },
  {
    name: 'couleur-en-dur',
    message: 'Couleur littérale : utiliser un token (src/styles/tokens.css).',
    pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\(/,
    only: CODE,
    allow: [/src\/styles\/tokens\.css$/, /src\/lib\/theme\.ts$/, /\.test\.ts$/],
  },
  {
    name: 'palette-tailwind',
    message: 'Couleur de palette Tailwind : un seul accent, via les tokens.',
    pattern: new RegExp(
      `\\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:${PALETTE_COLORS})-\\d{2,3}\\b`,
    ),
    only: CODE,
  },
  {
    name: 'valeur-arbitraire',
    message: 'Valeur arbitraire (px, couleur) dans une classe : utiliser un token.',
    pattern: /[a-z]-\[[^\]\s]*(?:\d+px|#[0-9a-fA-F]{3,8}|rgb)[^\]\s]*\]/,
    only: CODE,
  },
  {
    name: 'famille-typographique',
    message: 'Une seule famille typographique (font-sans) : pas de mono ni de serif décoratifs.',
    pattern: /\bfont-(?:mono|serif)\b/,
    only: CODE,
  },
  {
    name: 'etiquette-majuscules',
    message:
      'Pas d’étiquette en majuscules espacées (uppercase + tracking) : un titre est un titre.',
    pattern: /uppercase[^"'`\n]*\btracking-|\btracking-[^"'`\n]*uppercase/,
    only: ['.astro', '.ts'],
  },
  {
    name: 'emoji',
    message: 'Pas d’emoji : icônes SVG décoratives (lib/icons.ts).',
    pattern: /\p{Emoji_Presentation}/u,
    only: TEXT,
  },
  {
    name: 'phrase-generique',
    message: 'Formule générique : écrire un fait précis.',
    pattern: new RegExp(
      GENERIC_PHRASES.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      'i',
    ),
    only: TEXT,
    allow: [/design-rules\.mjs$/, /\.test\./],
  },
];
