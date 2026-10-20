# ADR-0010 — Le dépôt GitHub en OpenTofu

- Statut : accepté (2026-10-20, #255)

## Contexte

Après #181, Cloudflare et OVH sont décrits en OpenTofu. Le dépôt GitHub (réglages, protections, variables, environnements, secrets Actions) restait réglé à la main, par des `gh api -X …` d'actions « propriétaire », sans trace de dérive. GitHub Pages est désactivé depuis le renommage du dépôt en `portfolio` (#257).

## Décision

- **Brique `infra/github/`**, avec son propre state et le provider `integrations/github` 6.13.x épinglé. L'existant est **importé** tel qu'il est : dépôt, branche par défaut, alertes et correctifs Dependabot, rulesets et protections classiques de `develop` et `main`, variable publique, environnements. Le premier `apply` ne fait que des imports.
- **Le dépôt n'est jamais détruit** : `prevent_destroy`, `archive_on_destroy = true`, et un refus dans le code (`scripts/lib/tf-plan-guard.mjs`) même si le dépôt figure dans `allowed-destroys.txt`.
- **Aucune relecture humaine exigée** dans les protections (projet mené seul) : les checks `ci` et `commitlint` gardent les fusions.
- **GitHub Pages n'est pas géré** : un bloc `check` échoue s'il est réactivé.
- **Secrets Actions posés par `infra/identity/`** (`github_actions_secret`), où leurs valeurs sont déjà dans le state. `npm run infra:identity-push` n'écrit plus que le fichier de secrets local.
- **Jeton `GITHUB_IAC_TOKEN`** : fine-grained, limité au dépôt, 90 jours. Le chargeur ne le donne qu'à `infra/github/` et `infra/identity/` (`githubEnv`, `identityEnv`) ; `childEnv` le refuse et le retire de l'environnement hérité.

## Conséquences

- Le signalement privé de vulnérabilités n'a pas de ressource dans le provider 6.13 : il reste activé à la main.
- `archive_on_destroy` et `ignore_vulnerability_alerts_during_read` sont des champs du provider, absents de l'API GitHub. Après l'import, leur première écriture apparaît comme une modification qui ne change rien côté GitHub.
- Modifier les secrets Actions demande un `apply` de `infra/identity/`, donc des jetons de départ temporaires (`infra/identity/README.md`) et `GITHUB_IAC_TOKEN`.
- `infra/github/` a des blocs `import` : comme la racine de `infra/`, elle n'a pas de `tofu test`. Ses invariants sont vérifiés par `scripts/infra-github-config.test.mjs`.
- CI : `tofu-plan` planifie la brique avec un jeton en lecture seule (`GITHUB_IAC_READONLY_TOKEN`). C'est un **jeton personnel créé à la main** et posé par le propriétaire (`gh secret set`), volontairement hors de `infra/identity/` : GitHub n'expose pas la création de jetons fine-grained par API.
- Premier `apply` (2026-10-20) : 11 imports et une modification limitée à `archive_on_destroy` et `ignore_vulnerability_alerts_during_read`. Le plan suivant donne « No changes ».
