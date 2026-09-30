# Primitives UI

Composants Astro **sans logique métier** de `src/components/ui/`. Ils reçoivent des props typées (`interface Props`), n'importent que `lib/` et ne connaissent ni le contenu, ni les services, ni les sections (règle de couches vérifiée par `npm run check:layers`). Toutes les couleurs, tailles et espacements viennent des tokens (`src/styles/tokens.css`) — jamais de valeur en dur.

Vitrine vivante : `/fr/styleguide/` et `/en/styleguide/` (non indexées, `noindex`, exclues du sitemap).

| Composant                   | Rôle                                                                   | Props principales                                                 |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Container`                 | Largeur max de page + gouttière                                        | `as` (`div`, `header`, `nav`, `footer`), `class`                  |
| `Section`                   | Section ancrée, nommée par son titre (`aria-labelledby`)               | `id`, `title`, `index` (affiche « 03 — »)                         |
| `Heading`                   | Titre h1–h4 ; **niveau sémantique découplé de la taille**              | `level`, `size` (`display`, `2xl`, `xl`, `lg`), `id`, `class`     |
| `Card`                      | Bloc à filet, sans ombre                                               | `as` (`div`, `li`, `article`), `interactive`                      |
| `Tag`                       | Étiquette mono rectangulaire                                           | slot                                                              |
| `ButtonLink`                | Lien stylé en bouton ; lien externe → `target`/`rel` sûrs automatiques | `href`, `variant` (`primary`, `secondary`), `icon`, `newTabLabel` |
| `ExternalLink`              | Lien de texte sortant + annonce « nouvel onglet »                      | `href`, `newTabLabel`                                             |
| `Icon`                      | SVG décoratif (`aria-hidden`), jeu défini dans `lib/icons.ts`          | `name`                                                            |
| `DescriptionList`           | `<dl>` terme/description                                               | `items`                                                           |
| `Timeline` / `TimelineItem` | Liste ordonnée chronologique, `<time datetime>`                        | `title`, `subtitle`, `period`, `dateTime`                         |
| `VisuallyHidden`            | Texte réservé aux lecteurs d'écran                                     | slot                                                              |
| `SkipLink`                  | Lien d'évitement (premier arrêt clavier)                               | `label`, `target`                                                 |

## Règles d'usage

- **Un motif répété = une primitive.** Si un bloc de classes apparaît deux fois, il devient un composant ici.
- **Textes traduits en amont** : les primitives reçoivent des chaînes (`newTabLabel`, `period`…), elles n'appellent pas `t()`.
- **Liens** : `lib/links.ts` (`linkAttributes`) décide de `target="_blank" rel="noopener noreferrer"` ; ne jamais l'écrire à la main.
- **Icônes** : ajouter le tracé dans `lib/icons.ts` (grille 24, trait 1.5) ; les icônes restent décoratives, le sens passe par du texte.
- **Nouvelle primitive** : props typées, ≤ 60 lignes, test de rendu (`*.test.ts` avec `src/test/render.ts`), exemple dans le styleguide, ligne dans ce tableau.

## Tests

- Rendu : Container API d'Astro (`src/components/ui/*.test.ts`) — props → HTML.
- E2E : `e2e/ui-primitives.spec.ts` sur le styleguide (hiérarchie des titres, repères nommés, liens sûrs, navigation clavier et focus visible, chronologie, icônes décoratives), FR et EN.
