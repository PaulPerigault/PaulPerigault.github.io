# Charte de design — « CV d'abord »

Un portfolio DevOps doit ressembler à un document bien composé, pas à un template. Depuis l'audit `docs/audit-ia.md`, la charte évite aussi le second gabarit « anti-IA » (fond crème, serif système, accent sarcelle, étiquettes mono, sections numérotées) : voir ADR-0006. Cette charte décrit l'identité visuelle, ce qu'on s'interdit et comment c'est vérifié. Les valeurs vivent dans `src/styles/tokens.css` ; cette page explique _pourquoi_.

## Identité

- **Lisibilité d'abord** : la page se lit comme un CV bien composé. Fond quasi blanc (`--pp-bg`), texte encre (`--pp-fg`), surface légèrement teintée pour les rares aplats. Le thème sombre a les mêmes rôles, définis une seule fois avec `light-dark()`.
- **Un seul accent** : le bleu outremer (`--pp-accent`) sert aux liens actifs, au titre de rôle, au focus et au bouton principal. Jamais deux couleurs d'accent.
- **Une seule famille typographique**, choisie et auto-hébergée : Atkinson Hyperlegible Next (Braille Institute, licence SIL OFL), une police conçue pour la lisibilité. La hiérarchie vient du poids et de la taille, pas d'un mélange serif / mono. Aucune requête tierce (`src/styles/fonts.css`, préchargement du sous-ensemble latin).
- **Structure de CV** : titre de section à gauche, contenu à droite (`Section`), filets fins entre sections et entre entrées, dates alignées à droite du titre, angles quasi droits (`--pp-radius`).
- **Impression** : `@media print` (dans `base.css`) supprime navigation et pied de page, force le thème clair et écrit l'adresse des liens ; la page imprimée est le CV papier.
- **Mouvement** : transitions courtes (`--pp-duration`) sur les couleurs uniquement ; `prefers-reduced-motion` respecté.

## Interdits (et pourquoi)

| Interdit                                                                                                     | Raison                                                  | Vérifié par                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Dégradés décoratifs                                                                                          | Signature des pages générées                            | `check-design` (`gradient`) + e2e styles calculés                                                 |
| Ombres portées décoratives                                                                                   | Profondeur artificielle ; on structure avec des filets  | `check-design` (`ombre`) + e2e                                                                    |
| Glassmorphism (`backdrop-blur`)                                                                              | Effet de mode sans fonction                             | `check-design` (`flou`) + e2e                                                                     |
| Couleur en dur, palette Tailwind, valeur arbitraire (`w-[13px]`, `bg-[#fff]`)                                | Une seule source : les tokens                           | `check-design` (`couleur-en-dur`, `palette-tailwind`, `valeur-arbitraire`)                        |
| Mono / serif décoratifs, majuscules espacées, numéros de section (« 01 — »), pastilles-tags, icône par ligne | Le gabarit « éditorial minimal » est devenu un marqueur | `check-design` (`famille-typographique`, `etiquette-majuscules`) + e2e (`design-charter.spec.ts`) |
| Emoji comme icônes ou décoration                                                                             | Illisible aux lecteurs d'écran, générique               | `check-design` (`emoji`) + e2e                                                                    |
| Grilles de cartes identiques ombrées, pastilles arrondies partout, avatar rond                               | Motifs interchangeables                                 | Revue (checklist de PR) + e2e (rayon ≤ 4 px)                                                      |
| Formules creuses (« passionné par… », « cutting-edge », « solutions innovantes »)                            | On écrit des faits : employeur, technologies, dates     | `check-design` (`phrase-generique`, liste dans `scripts/lib/design-rules.mjs`)                    |

## Comment ajouter du design

1. Un nouveau rôle de couleur → ajouter le token **dans les deux thèmes** (`tokens.css`), l'exposer dans `theme.css`, vérifier les contrastes (`contrast.test.ts` échoue sous 4,5:1 texte / 3:1 contrôles).
2. Un motif répété → une primitive dans `src/components/ui/` (voir `docs/ui.md`).
3. Un texte → concret : nom propre, technologie, date, chiffre. Relire à voix haute : si la phrase pourrait s'appliquer à n'importe qui, la réécrire.
4. Lancer `npm run check:design` et `npm run e2e`.

## Checklist de revue « design anti-IA »

- [ ] Aucun texte laissé tel que généré : relu et réécrit à la main, sans placeholder.
- [ ] Un seul accent, tous les styles passent par les tokens.
- [ ] Aucun dégradé, ombre décorative, flou, emoji.
- [ ] Provenance des assets connue (photo personnelle, logo `logo.svg`, police Atkinson sous licence OFL, icônes maison).
- [ ] Carte de partage et favicons régénérés (`scripts/generate-og-image.mjs`, skill `update-favicon`) si le design change.
- [ ] Contraste AA vérifié en clair **et** en sombre.
