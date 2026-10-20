# Brique `github`

Réglages des dépôts **`PaulPerigault/portfolio`** (#255, ADR-0010) et **`PaulPerigault/design-system`** (#268, ADR-0011) en OpenTofu, avec le provider `integrations/github` **6.13.x**, épinglé, et `.terraform.lock.hcl` pour Windows, Linux et macOS. State propre : clé `github/terraform.tfstate` du bucket R2 `tfstate-portfolio`, sans secret.

| Fichier          | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repository.tf`  | `github_repository.portfolio` : description, site `https://paulperigault.fr`, topics, fusions autorisées, auto-merge, suppression des branches fusionnées, `security_and_analysis`. **`prevent_destroy`** et **`archive_on_destroy = true`**. Aussi : branche par défaut `develop`, alertes Dependabot (actives), correctifs Dependabot automatiques (désactivés), et un `check` qui échoue si GitHub Pages est réactivé (Pages n'est pas géré). |
| `protections.tf` | rulesets `develop-protect` et `main-protect`, protections classiques de `develop` et `main` (checks `ci` et `commitlint`). **Aucune relecture humaine exigée** : 0 approbation (projet mené seul).                                                                                                                                                                                                                                               |
| `actions.tf`     | variable `PUBLIC_TURNSTILE_SITEKEY` (publique), environnements `copilot` et `github-pages` (vestige). Les **secrets** Actions sont posés par `infra/identity/` (`github.tf`), où leurs valeurs sont déjà.                                                                                                                                                                                                                                        |
| `design-system.tf`, `design-system-protections.tf` | dépôt design-system **importé** (`prevent_destroy`, `archive_on_destroy`), squash seul (message = corps de la PR), `main` créée depuis `develop`, rulesets `develop`/`main` (check `ci`), actions autorisées restreintes, environnements `npm-publish` et `docs-deploy` limités à `main`. Variable `design_system` : `false` en CI tant que le jeton en lecture seule n'a pas accès au dépôt. |
| `imports.tf`     | tout l'existant est importé, rien n'est recréé.                                                                                                                                                                                                                                                                                                                                                                                                  |

Hors de la brique : le signalement privé de vulnérabilités (aucune ressource dans le provider 6.13 ; activé à la main, `SECURITY.md`) et le secret `CLOUDFLARE_API_TOKEN_DEPLOY` du Worker.

## Commandes

```shell
npm run infra:github -- init
npm run infra:github -- plan -out=github.tfplan
npm run infra:github -- apply github.tfplan      # seulement un plan enregistré et relu
```

`infra:github` charge `GITHUB_IAC_TOKEN` (jeton fine-grained limité au dépôt, 90 jours, passé au provider sous `GITHUB_TOKEN`) et les clés S3 du state, jamais un jeton d'amorçage (`githubEnv`, `scripts/lib/infra-secrets.mjs`). Elle refuse, comme les autres briques, `destroy`, `-destroy`, un `apply` sans plan `*.tfplan` et un plan qui détruit une ressource absente de `allowed-destroys.txt` (`scripts/lib/tf-args.mjs`). **Le dépôt n'est jamais détruit**, même s'il est listé (`scripts/lib/tf-plan-guard.mjs`, `scripts/infra-github-config.test.mjs`).

Droits de `GITHUB_IAC_TOKEN` (fine-grained, dépôt `PaulPerigault/portfolio` seul) :

- _Administration : Read and write_ (réglages, rulesets, protections, branche par défaut) ;
- _Variables_ et _Environments : Read and write_ ;
- _Secrets : Read and write_ (secrets Actions de `infra/identity/`) ;
- _Dependabot alerts : Read_ ;
- _Metadata : Read_, obligatoire ;
- _Pages : Read_ (contrôle « Pages désactivé »).

## Premier plan

Imports seuls. Une seule différence attendue sur `github_repository.portfolio` : `archive_on_destroy` et `ignore_vulnerability_alerts_during_read`, deux champs **propres au provider**, absents de l'API GitHub et donc vides après un import. Leur première écriture n'en change aucune valeur côté GitHub ; le plan suivant donne « No changes ».

## CI

GitHub refuse les noms de secrets Actions qui commencent par `GITHUB_` (HTTP 422), d'où le préfixe `IAC_` ; `scripts/workflows-secret-names.test.mjs` échoue si un workflow référence un autre secret `GITHUB_*` que `GITHUB_TOKEN`. `GITHUB_IAC_TOKEN` reste un jeton du seul fichier de secrets local, jamais un secret Actions.

**`IAC_GITHUB_READONLY_TOKEN` est un jeton personnel créé à la main par le propriétaire**, hors IaC : il n'est ni dans `infra/identity/` ni dans aucun state. GitHub n'a pas d'API pour créer un jeton fine-grained. Le propriétaire le pose lui-même avec `gh secret set IAC_GITHUB_READONLY_TOKEN -R PaulPerigault/portfolio` (valeur saisie au clavier) et le renouvelle à son expiration (90 jours).

- Accès : dépôt `PaulPerigault/portfolio` seul.
- Droits, tous en lecture seule : _Administration_, _Variables_, _Environments_, _Dependabot alerts_, _Pages_ et _Metadata_.
- Aucun droit sur _Contents_ ni sur _Secrets_.

Le job `tofu-plan` de `ci.yml` planifie la brique avec `IAC_GITHUB_READONLY_TOKEN`, un jeton fine-grained en **lecture seule**, et la clé R2 en lecture seule. Sans ce secret, l'étape est sautée et le signale. Chaque étape de plan doit trouver une ligne `Plan:` ou `No changes` et l'écrire dans le journal (`Résultat du plan de …`), sinon le job échoue (#262). Avec ce jeton, l'API REST lit vides les 8 réglages de fusion du dépôt. Un écart ne portant **que** sur eux est qualifié par `scripts/check-github-plan.mjs` (`scripts/lib/github-merge-settings.mjs`) : s'il est confirmé par GraphQL, lisible en lecture seule, l'avis devient « faux écart, réglages vérifiés par GraphQL ». Tout autre changement, une valeur réelle différente du code ou GraphQL injoignable restent signalés comme dérive (#262). Un écart (code 2) est signalé sans casser la CI.
