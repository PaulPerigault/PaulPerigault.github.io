# ADR-0002 — Effect pour la logique de données, côté build uniquement

- **Statut** : accepté

## Contexte

La couche de données Angular mélangeait `HttpClient`, RxJS, `catchError → []` (échecs silencieux), une façade sans logique et des types non validés. Le propriétaire souhaite appliquer les bonnes pratiques d'[Effect](https://effect.website).

## Décision

- Toute la logique de données (lecture et validation du contenu, appels à l'API GitHub, chargement des pages) est écrite avec Effect : `Schema` pour les modèles (types **et** validation), `Schema.TaggedError` pour les erreurs typées, services `Context.Tag` + `Layer`, `Config`/`Redacted` pour l'environnement et le jeton, `Schedule` (retries exponentiels limités aux erreurs transitoires), `Clock` pour l'horodatage.
- Un `ManagedRuntime` unique ; `runBuild(effect)` est **le seul pont Effect → Promise**, appelé depuis le frontmatter Astro.
- **Aucun code Effect n'est envoyé au navigateur** (budget e2e : < 5 Ko de JS gzip, aucune signature Effect).
- Tests avec `@effect/vitest` (`it.effect`, `TestClock`) et des `Layer` en mémoire.

## Conséquences

- (+) Un contenu invalide ou un dépôt GitHub introuvable fait échouer le build avec un message qui nomme le fichier/champ ou le dépôt (mode strict en CI, tolérant en local).
- (+) Les retries, timeouts et erreurs sont testés de façon déterministe (horloge simulée).
- (−) Courbe d'apprentissage d'Effect ; `@effect/vitest` déclare `vitest@^3` en peer : `package.json#overrides` le rattache à Vitest 4.
