# Infrastructure (Terraform)

Services du portfolio hébergés chez Cloudflare, sur la zone `paulperigault.dev`. Le domaine canonique `paulperigault.fr` reste chez OVH et n'est pas géré ici. Un **module par service**, composé par la racine (`main.tf`) :

| Module                  | Contenu                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/contact-form`  | widget Turnstile, Worker `contact-form` (sans code : déployé par Wrangler depuis `worker/`), domaine personnalisé `contact.paulperigault.dev` |
| `modules/resend-domain` | DKIM et chemin de retour de Resend sur `paulperigault.dev`, **importés** (`imports.tf`) et non recréés                                        |

Ajouter un service = un nouveau dossier `modules/<service>` (variables, outputs, README) et un bloc `module` dans `main.tf`, sans toucher aux autres.

**Répartition Terraform / Wrangler (option A, ADR-0007)** :

- Terraform gère le Worker en tant que service, son domaine et le widget Turnstile.
- Wrangler gère le **code** (`wrangler deploy`) et les **secrets** du Worker (`contact-form-secrets.ps1`).
- Pourquoi : le provider v5 n'a pas de ressource de secret autonome. Un secret y serait un binding d'une version du code, donc rejoué contre chaque `wrangler deploy` et stocké dans le state.
- Conséquence : la clé Resend n'entre jamais dans le state. Seul le secret du widget Turnstile y est, parce que Terraform crée le widget.

## Prérequis

- Terraform **1.15.x** (`versions.tf`) et provider Cloudflare **5.27.x**, empreintes figées dans `.terraform.lock.hcl` pour Windows, Linux et macOS (`terraform providers lock -platform=…` pour en ajouter).
- PowerShell 7 (`pwsh`).
- `infra/.secrets.env` (ignoré par Git **et** par Docker), quatre lignes `NOM=valeur`, guillemets englobants acceptés :
  - `TF_VAR_cloudflare_api_token` : token « terraform-portfolio » ;
  - `TF_VAR_resend_api_key` : clé Resend (accès _Sending_, domaine `paulperigault.dev`), lue seulement par `contact-form-secrets.ps1` ;
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` : clés **S3** du bucket R2 du state. Ce sont l'_Access Key ID_ (32 caractères hexadécimaux) et la _Secret Access Key_ (64), pas la valeur du token R2 ; une confusion donne `SignatureDoesNotMatch`. Les noms `AWS_*` sont imposés par le backend `s3` de Terraform ; il n'y a aucun compte AWS.

## Usage

Toujours passer par les helpers. Chacun charge **seulement** les variables dont il a besoin, le temps de la commande, puis les retire, même en cas d'erreur. Une variable inconnue dans le fichier fait échouer. Aucune valeur n'est jamais affichée.

| Helper                     | Variables chargées                                                            |
| -------------------------- | ----------------------------------------------------------------------------- |
| `tf.ps1`                   | token Cloudflare, clés S3 du state                                            |
| `dns-records.ps1`          | token Cloudflare                                                              |
| `contact-form-secrets.ps1` | les quatre (token pour Wrangler, clé Resend, clés S3 pour `terraform output`) |

```powershell
.\infra\tf.ps1 init                  # première fois : backend R2
.\infra\tf.ps1 plan                  # lu et relu avant tout apply
.\infra\tf.ps1 apply                 # propriétaire uniquement, jamais en CI
.\infra\tf.ps1 output contact_form_turnstile_sitekey
.\infra\dns-records.ps1              # lecture seule : identifiants DNS pour les imports
.\infra\contact-form-secrets.ps1     # pose RESEND_API_KEY et TURNSTILE_SECRET sur le Worker (stdin)
```

Ne jamais lancer `terraform show`, `state show`, ni `output` sans nom de sortie : le secret Turnstile y apparaîtrait. `output contact_form_turnstile_sitekey` (publique) est sans risque.

Sans secrets (CI, vérification locale) : `terraform -chdir=infra init -backend=false`, puis `terraform -chdir=infra validate` et `terraform fmt -recursive -check infra`.

Tests (faux fichiers et doublures de `terraform`/`npx`, jamais les vrais secrets) : `pwsh infra/tests/secrets-loader.test.ps1` et `pwsh infra/tests/contact-form-secrets.test.ps1`.

## Premier déploiement (propriétaire)

Un domaine personnalisé doit viser un Worker qui existe déjà. La doc du provider ne dit pas si un Worker créé par `cloudflare_worker`, mais jamais déployé, suffit. La séquence retenue évite la question, sans modifier le code :

1. `.\infra\tf.ps1 apply -target=module.contact_form.cloudflare_worker.contact -target=module.contact_form.cloudflare_turnstile_widget.contact -target=module.resend_domain` : Worker sans code, widget, import des enregistrements Resend, sans le domaine.
2. `npm --prefix worker run deploy`, avec le token Cloudflare dans `CLOUDFLARE_API_TOKEN` : première version du code.
3. `.\infra\contact-form-secrets.ps1` : secrets du Worker.
4. `.\infra\tf.ps1 apply` (complet) : le domaine `contact.paulperigault.dev`. Le plan ne doit plus montrer que lui.
5. `gh variable set PUBLIC_TURNSTILE_SITEKEY` avec la sortie `contact_form_turnstile_sitekey`, à la place de la clé de test.

Ensuite, la CI déploie le code ; les secrets ne bougent qu'à une rotation (étape 3).

## State

Backend `s3` vers R2 (`backend.tf`) : bucket `tfstate-portfolio`, créé à la main et **non géré par Terraform**. Le state contient un secret, celui du widget Turnstile ; la clé Resend n'y entre pas. Il reste dans R2 et n'est jamais dans le dépôt. `*.tfstate*` et `*.tfplan` sont ignorés : un plan enregistré contient aussi les secrets en clair. Pas de verrou de state : un seul opérateur, aucun `apply` automatique.

## Rotation des tokens

1. Créer le nouveau token ou la nouvelle clé dans Cloudflare, Resend ou R2, avec les **mêmes** permissions minimales.
2. Remplacer la valeur dans `infra/.secrets.env`.
3. `.\infra\tf.ps1 plan` : le plan doit rester vide. Un changement de token ne modifie aucune ressource.
4. Clé Resend renouvelée, ou widget Turnstile recréé : relancer `.\infra\contact-form-secrets.ps1` (nouvelle version du Worker, même code).
5. Révoquer l'ancien token.

Permissions du token Terraform :

- Turnstile, Workers Scripts, Workers Routes et DNS sont nécessaires ici ; les autres (R2, KV, D1, Queues) servent aux services futurs.
- Turnstile et Workers Scripts sont des permissions **de compte** : le token doit inclure le compte, pas seulement la zone.
- Le déploiement du code en CI utilise un token distinct, limité à _Workers Scripts : Edit_ (`CLOUDFLARE_API_TOKEN_DEPLOY`).
