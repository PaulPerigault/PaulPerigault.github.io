# Inventaire du design system (pour #182)

État mesuré le 2026-10-19 sur `develop` (`9d4f6a8`), **sans modification du code**. Sert de base au cadrage de #182 ; les références visuelles (#201, `docs/visual-regression.md`) protègent le rendu actuel pendant une refonte.

## 1. Tokens

Source unique : `src/styles/tokens.css` (`--pp-*`, clair/sombre définis une fois avec `light-dark()`), exposés à Tailwind par `src/styles/theme.css`, qui retire la palette, les tailles, les rayons et les ombres par défaut de Tailwind.

| Token | Rôle | Exposé à Tailwind | Utilisé dans les composants |
| --- | --- | --- | --- |
| `--pp-bg` | fond de page | `bg-bg` | oui (7 classes) |
| `--pp-surface` | aplat légèrement teinté | `bg-surface` | **non (0)** |
| `--pp-fg` | texte encre | `text-fg` | oui (11) |
| `--pp-muted` | texte secondaire | `text-muted` | oui (18) |
| `--pp-line` | filets | `border-line` | oui (6) |
| `--pp-control` | bordure des contrôles (3:1) | `border-control` | oui (7) |
| `--pp-accent` | l'unique accent | `text-accent`, `bg-accent` | oui (23) |
| `--pp-on-accent` | texte sur accent | `text-on-accent` | oui (1, + `base.css`) |
| `--pp-font-sans` | Atkinson Hyperlegible Next | `font-sans` | oui (corps) |
| `--pp-measure` | largeur de lecture (42rem) | `max-w-prose` | oui |
| `--pp-page` | largeur de page (64rem) | `max-w-page` | oui (`Container`) |
| `--pp-space-section` | espacement vertical des sections | `py-section` | oui (`Section`) |
| `--pp-radius` | angles quasi droits (2px) | `rounded-sm` | oui (seul rayon utilisé) |
| `--pp-duration` | durée des transitions (150ms) | `duration-(--pp-duration)` | oui (4 fichiers) |

**Totaux** : 14 tokens `--pp-*`. 22 variables effectives dans `theme.css` (8 couleurs de rôle + 2 utilitaires, 1 famille, 7 tailles de texte, 1 rayon, 2 largeurs, 1 espacement). Contraste AA vérifié par `src/lib/contrast.test.ts`.

**Échelle typographique** (`theme.css`) : `text-xs` à `text-2xl` et `text-display`. Utilisées : `text-sm` (15 classes), `text-lg` (3), `text-xl` (3), `text-2xl` (2), `text-display` (1). **Inutilisées : `text-xs`, `text-base`** (le corps hérite de la taille de base).

## 2. Composants

32 composants `.astro` : 13 primitives `ui`, 8 de mise en page, 10 sections, 1 interactif. Catalogue des primitives : `docs/ui.md`, vitrine `/fr/styleguide/`.

| Primitive (`components/ui`) | Fichiers qui l'utilisent | Usages |
| --- | --- | --- |
| `Heading` | 6 | 7 |
| `Section` | 6 | 6 |
| `ButtonLink` | 2 | 6 |
| `Container` | 5 | 5 |
| `Icon` | 3 | 5 |
| `ExternalLink` | 2 | 3 |
| `FormField` | 1 | 3 |
| `VisuallyHidden` | 3 | 3 |
| `Card`, `DescriptionList`, `SkipLink`, `Timeline`, `TimelineItem` | 1 chacune | 1 chacune |

Hors styleguide et tests.

- Mise en page (`components/layout`) : `Navbar`, `NavLinks`, `MobileMenu`, `LangSwitch`, `ThemeToggle`, `Footer`, `SeoHead`, `SeoPageTags`.
- Sections : `Hero`, `About`, `Experience`/`Formation` (via `TimelineSection`), `Skills`, `Projects`, `Certifications`, `Contact`, `LegalDocument`.
- Interactif : `ContactForm`.
- Styles de bouton partagés hors composant : `src/lib/button-styles.ts` (utilisé par `ButtonLink` et le bouton d'envoi du formulaire).

**Classes utilitaires** : 274 occurrences, 117 distinctes. Couleurs uniquement par tokens de rôle (47 classes), aucun `style=` en ligne, aucune couleur codée en dur (`scripts/check-design.mjs`). Les sections portent encore leurs propres classes de mise en forme (Projects 8 attributs `class`, Hero 7, LegalDocument 6), en plus des primitives.

## 3. Écarts avec ADR-0006 et `docs/design-charter.md`

`npm run check:design` et `e2e/design-charter.spec.ts` sont verts : aucun **interdit** de la charte n'est présent (mono ou serif décoratifs, majuscules espacées, numérotation, pastilles, dégradés, ombres, flou, emoji, couleurs hors tokens). Les écarts relevés concernent la **complétude** du système, pas des violations :

| # | Écart | Constat mesuré | Piste pour #182 |
| --- | --- | --- | --- |
| E1 | Token sans usage | `--pp-surface` (« surface légèrement teintée pour les rares aplats », charte §Identité) n'est utilisé par aucun composant | l'utiliser (cartes, formulaire) ou le retirer de la charte |
| E2 | Échelle typographique plus large que l'usage | `text-xs` et `text-base` définis, jamais utilisés | réduire l'échelle ou documenter leur rôle |
| E3 | Espacement hors tokens | seul `--pp-space-section` est un token ; les marges internes utilisent l'échelle par défaut de Tailwind (11 pas distincts : 0, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12 ; 57 classes) | une échelle d'espacement nommée et restreinte (par ex. 4 à 6 pas) |
| E4 | Largeurs de colonnes en valeurs arbitraires | 5 grilles `[…]`, 4 gabarits distincts : `Section` `13rem 1fr`, `Skills` `11rem 1fr`, `DescriptionList`/`Contact` `max-content 1fr`, `Hero` `1fr auto` ; la colonne de titre a deux largeurs (13rem, 11rem) | token de colonne de titre (structure de CV : « titre à gauche ») partagé |
| E5 | Styles de bouton hors primitive | `lib/button-styles.ts` sert un `ButtonLink` et un `<button>` du formulaire | une primitive `Button` (lien ou bouton) |
| E6 | Mise en forme dans les sections | 35 attributs `class` dans `components/sections` en plus des primitives | identifier les motifs répétés (méta de carte, listes de technologies) et en faire des primitives |
| E7 | Section Projets hors filet visuel | masquée dans les captures (#201) car ses données changent au build | captures avec des données GitHub figées (faux serveur, comme `build-projects.test.mjs`) |

## 4. Commandes de comptage (rejouables)

```shell
grep -oE -- '--pp-[a-z0-9-]+:' src/styles/tokens.css | sort -u | wc -l          # 14 tokens
find src/components -name '*.astro' | awk -F/ '{print $3}' | sort | uniq -c     # composants par dossier
grep -rhoE '\btext-(xs|sm|base|lg|xl|2xl|display)\b' src --include='*.astro' | sort | uniq -c
grep -rhoE '(bg|text|border)-surface\b' src --include='*.astro' --include='*.ts' | wc -l   # 0
grep -rnoE 'grid-cols-\[[^]]+\]' src/components --include='*.astro'               # E4 : 5
grep -rcE 'class=' src/components/sections/*.astro                               # E6
```

Usages des primitives : nombre de balises `<Nom ` ou `<Nom>` dans `src/**/*.{astro,ts}`, hors fichier de la primitive, tests et styleguide.
