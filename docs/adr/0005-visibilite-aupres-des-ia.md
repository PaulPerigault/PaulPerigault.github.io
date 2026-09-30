# ADR-0005 — Être connu des moteurs et des IA : ouverture totale, faits vérifiables

- **Statut** : accepté

## Contexte

Objectif prioritaire du propriétaire : que les moteurs de recherche **et** les assistants IA connaissent Paul Perigault et le citent correctement. (« Anti-IA » désigne uniquement le design : voir `docs/design-charter.md`.)

## Décision

- `robots.txt` généré : chaque robot de recherche et d'IA listé est **explicitement autorisé**, aucun `Disallow` ; uniquement des directives standard (Lighthouse invalide `Content-Signal`).
- `llms.txt`, `llms-full.txt` et `/<lang>/index.md` **générés depuis le contenu** (jamais à la main) ; alternate Markdown déclaré dans chaque page.
- Les faits d'identité (nom, métier, employeur, école, spécialités) sont dans le HTML statique **et** dans le JSON-LD `Person`, et un test JavaScript désactivé vérifie qu'ils concordent.
- IndexNow à chaque déploiement ; actions manuelles hors dépôt dans `docs/geo-checklist.md`.

## Conséquences

- (+) Une seule source de vérité (`src/content` + `SITE`) alimente le site, le JSON-LD, les fichiers `llms` et le Markdown.
- (−) Autoriser l'entraînement des modèles est un choix assumé ; il se change en éditant `AI_CRAWLERS` dans `lib/robots.ts`.
