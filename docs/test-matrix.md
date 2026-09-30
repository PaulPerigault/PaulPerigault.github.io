# Matrice de tests

Chaque fonctionnalité est couverte par au moins un test **e2e Playwright** (FR et EN quand elle est localisée). `npm run check:matrix` (dans `guard`) échoue si un fichier `e2e/*.spec.ts` n'est pas listé ici, si un fichier listé n'existe pas, ou si une ligne n'a ni test e2e ni justification `n/a`.

| Fonctionnalité                                                         | Issue | Tests e2e                                                                                                           |
| ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| Socle statique, titre, `lang`, redirection de la racine                | #65   | `smoke.spec.ts`                                                                                                     |
| Garde-fous qualité (taille, couches, design, code mort)                | #66   | n/a : outillage sans interface, testé par les tests unitaires des scripts                                           |
| Aucun code Effect ni JS superflu dans le navigateur                    | #67   | `bundle-budget.spec.ts`                                                                                             |
| Contenu bilingue FR/EN sans texte de l'autre langue                    | #68   | `i18n.spec.ts`                                                                                                      |
| Tokens, thème clair/sombre sans flash, lien d'évitement                | #69   | `theme.spec.ts`, `skip-link.spec.ts`                                                                                |
| Primitives UI réutilisables                                            | #70   | `ui-primitives.spec.ts`                                                                                             |
| Navbar, menu mobile, langue, bascule de thème, footer, sans JavaScript | #71   | `navigation.spec.ts`, `mobile-menu.spec.ts`, `lang-switch.spec.ts`, `theme-toggle.spec.ts`, `no-javascript.spec.ts` |
| Hero, À propos, Contact                                                | #72   | `hero.spec.ts`, `about-contact.spec.ts`                                                                             |
| Compétences, Expérience, Formation, Certifications                     | #73   | `sections-data.spec.ts`, `section-anchors.spec.ts`                                                                  |
| Projets GitHub récupérés au build                                      | #74   | `projects.spec.ts`                                                                                                  |
| SEO : canonical, hreflang, Open Graph, JSON-LD, sitemap, 404           | #75   | `seo.spec.ts`, `crawl-files.spec.ts`                                                                                |
| CSP stricte, zéro violation                                            | #76   | `csp.spec.ts`                                                                                                       |
| Pipeline CI/CD GitOps                                                  | #77   | n/a : la CI est son propre test (chaque PR exécute verify, e2e, Lighthouse, conteneur)                              |
| Charte de design anti-IA                                               | #78   | `design-charter.spec.ts`                                                                                            |
| Accessibilité WCAG 2.2 AA (axe) sur toute la matrice                   | #79   | `accessibility.spec.ts`                                                                                             |
| Documentation                                                          | #80   | n/a : vérifiée par `scripts/check-docs.mjs` (commandes et liens)                                                    |
| Mentions légales, confidentialité et absence de traceurs (RGPD)        | #102  | `legal.spec.ts`, `privacy.spec.ts`                                                                                  |
| Visibilité auprès des moteurs et des IA (GEO)                          | #82   | `geo-files.spec.ts`, `geo-entity.spec.ts`                                                                           |

## Conventions

- Sélecteurs par **rôle et nom accessible** ; `data-*` seulement pour les hooks de comportement (`data-menu-open`, `data-theme-toggle`…). Jamais par position dans le DOM (`nth(2)`).
- Les tests comparent le rendu aux **données sources** (`src/content`), pas à des valeurs recopiées.
- Le rendu se teste aussi **sans JavaScript** (`javaScriptEnabled: false`) et en mobile (viewport 375).
- Navigateurs : Chromium à chaque PR ; Firefox et WebKit dans le workflow planifié (`PW_ALL_BROWSERS=1`).
