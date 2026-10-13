# Infrastructure (Terraform)

Services du portfolio hébergés chez Cloudflare, sur la zone `paulperigault.dev` (le domaine canonique `paulperigault.fr` reste chez OVH et n'est pas géré ici). Un **module par service**, composé par la racine (`main.tf`) :

| Module | Contenu |
| --- | --- |
| `modules/contact-form` | widget Turnstile, Worker `contact-form` (sans code : déployé par Wrangler depuis `worker/`), domaine personnalisé `contact.paulperigault.dev` |

Ajouter un service = un nouveau dossier `modules/<service>` (variables, outputs, README) et un bloc `module` dans `main.tf`, sans toucher aux autres.

## Prérequis

- Terraform **1.15.x** (`versions.tf`), provider Cloudflare **5.27.x**, empreintes figées dans `.terraform.lock.hcl` (Windows, Linux, macOS ; `terraform providers lock -platform=…` pour en ajouter).
- PowerShell 7 (`pwsh`).
- `infra/.secrets.env` (ignoré par Git **et** par Docker), quatre lignes `NOM=valeur` :
  - `TF_VAR_cloudflare_api_token` : token « terraform-portfolio » ;
  - `TF_VAR_resend_api_key` : clé Resend (accès *Sending*, domaine `paulperigault.dev`) ;
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` : clés S3 du bucket R2 du state. Les noms `AWS_*` sont imposés par le backend `s3` de Terraform ; il n'y a aucun compte AWS.

## Usage

Toujours passer par le helper, qui charge `.secrets.env` le temps de la commande puis retire les variables, même en cas d'erreur. Il refuse toute variable hors de cette liste et n'affiche jamais de valeur.

```powershell
.\infra\tf.ps1 init                 # première fois : backend R2
.\infra\tf.ps1 plan                 # lu et relu avant tout apply
.\infra\tf.ps1 apply                # propriétaire uniquement, jamais en CI
.\infra\tf.ps1 output contact_form_turnstile_sitekey
.\infra\dns-records.ps1             # lecture seule : identifiants DNS pour les imports
```

Sans secrets (CI, vérification locale) : `terraform -chdir=infra init -backend=false`, puis `terraform -chdir=infra validate` et `terraform fmt -recursive -check infra`.

Tests du chargeur (avec de faux fichiers, jamais le vrai) : `pwsh infra/tests/secrets-loader.test.ps1`.

## State

Backend `s3` vers R2 (`backend.tf`) : bucket `tfstate-portfolio`, créé à la main et **non géré par Terraform**. Le state contient des secrets (secret du widget Turnstile, et bindings du Worker selon la répartition retenue). Il reste dans R2 et n'est jamais dans le dépôt (`*.tfstate*` et `*.tfplan` sont ignorés : un plan enregistré contient aussi les secrets en clair). Pas de verrou de state : un seul opérateur, aucun `apply` automatique.

## Rotation des tokens

1. Créer le nouveau token ou la nouvelle clé dans Cloudflare, Resend ou R2, avec les **mêmes** permissions minimales.
2. Remplacer la valeur dans `infra/.secrets.env`.
3. `.\infra\tf.ps1 plan` : le plan doit rester vide. Un changement de token ne modifie aucune ressource.
4. Révoquer l'ancien token.
5. Pour la clé Resend et le secret Turnstile, qui sont des secrets du Worker, suivre la procédure de la répartition Terraform / Wrangler décrite dans l'ADR-0007.

Permissions du token Terraform : Turnstile, Workers Scripts, Workers Routes et DNS sont nécessaires ici ; les autres (R2, KV, D1, Queues) servent aux services futurs. Turnstile et Workers Scripts sont des permissions **de compte** : le token doit inclure le compte, pas seulement la zone.
