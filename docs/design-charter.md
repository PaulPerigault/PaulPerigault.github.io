# Charte de design — « papier et encre »

Un portfolio d'ingénieur DevOps doit ressembler à un document technique bien composé, pas à un template. Cette charte décrit l'identité visuelle, ce qu'on s'interdit et comment c'est vérifié. Les valeurs vivent dans `src/styles/tokens.css` ; cette page explique _pourquoi_.

## Identité

- **Papier / encre** : fond chaud (`--pp-bg`), texte encre (`--pp-fg`), surface légèrement plus sombre pour les aplats rares. Le thème sombre est l'« encre » : mêmes rôles, valeurs inversées, définis une seule fois avec `light-dark()`.
- **Un seul accent** : le teal du logo (`--pp-accent`), utilisé pour les repères (numéros de section, liens actifs, focus, boutons primaires). Jamais deux couleurs d'accent.
- **Typographie** : titres en serif système (`--pp-font-serif`), métadonnées (dates, étiquettes, libellés) en mono (`--pp-font-mono`), texte courant en sans système. Zéro police à charger.
- **Structure** : filets fins (`border-line`), numérotation des sections (« 01 — »), grille asymétrique, angles quasi droits (`--pp-radius`).
- **Mouvement** : transitions courtes (`--pp-duration`) sur les couleurs uniquement ; `prefers-reduced-motion` respecté.

## Interdits (et pourquoi)

| Interdit                                                                          | Raison                                                 | Vérifié par                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Dégradés décoratifs                                                               | Signature des pages générées                           | `check-design` (`gradient`) + e2e styles calculés                              |
| Ombres portées décoratives                                                        | Profondeur artificielle ; on structure avec des filets | `check-design` (`ombre`) + e2e                                                 |
| Glassmorphism (`backdrop-blur`)                                                   | Effet de mode sans fonction                            | `check-design` (`flou`) + e2e                                                  |
| Couleur en dur, palette Tailwind, valeur arbitraire (`w-[13px]`, `bg-[#fff]`)     | Une seule source : les tokens                          | `check-design` (`couleur-en-dur`, `palette-tailwind`, `valeur-arbitraire`)     |
| Emoji comme icônes ou décoration                                                  | Illisible aux lecteurs d'écran, générique              | `check-design` (`emoji`) + e2e                                                 |
| Grilles de cartes identiques ombrées, pastilles arrondies partout, avatar rond    | Motifs interchangeables                                | Revue (checklist de PR) + e2e (rayon ≤ 4 px)                                   |
| Formules creuses (« passionné par… », « cutting-edge », « solutions innovantes ») | On écrit des faits : employeur, technologies, dates    | `check-design` (`phrase-generique`, liste dans `scripts/lib/design-rules.mjs`) |

## Comment ajouter du design

1. Un nouveau rôle de couleur → ajouter le token **dans les deux thèmes** (`tokens.css`), l'exposer dans `theme.css`, vérifier les contrastes (`contrast.test.ts` échoue sous 4,5:1 texte / 3:1 contrôles).
2. Un motif répété → une primitive dans `src/components/ui/` (voir `docs/ui.md`).
3. Un texte → concret : nom propre, technologie, date, chiffre. Relire à voix haute : si la phrase pourrait s'appliquer à n'importe qui, la réécrire.
4. Lancer `npm run check:design` et `npm run e2e`.

## Checklist de revue « design anti-IA »

- [ ] Aucun texte laissé tel que généré : relu et réécrit à la main, sans placeholder.
- [ ] Un seul accent, tous les styles passent par les tokens.
- [ ] Aucun dégradé, ombre décorative, flou, emoji.
- [ ] Provenance des assets connue (photo personnelle, logo `logo.svg`, icônes maison).
- [ ] Contraste AA vérifié en clair **et** en sombre.
