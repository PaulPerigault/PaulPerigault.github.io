# Infrastructure (OpenTofu)

Services du portfolio hébergés chez Cloudflare : la zone `paulperigault.dev` (services, redirection vers le `.fr`) et la zone DNS du domaine canonique `paulperigault.fr`. OVH reste le **registrar** du `.fr` : couper DNSSEC, changer les serveurs de noms et publier le DS s'y font à la main (`docs/runbook-cloudflare.md` §4), tout le reste est ici. Un **module par service**, composé par la racine (`main.tf`) :

| Module                       | Contenu                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/contact-form`       | widget Turnstile, Worker `contact-form` (sans code : déployé par Wrangler depuis `worker/`), domaine personnalisé `contact.paulperigault.dev` |
| `modules/resend-domain`      | DKIM et chemin de retour de Resend sur `paulperigault.dev`, **importés** (`imports.tf`) et non recréés                                        |
| `modules/pages-site`         | projet Cloudflare Pages (envoi direct) et ses domaines personnalisés                                                                          |
| `modules/zone-fr`            | zone `paulperigault.fr` : messagerie iCloud, vérifications, enregistrements du site, réglages, DNSSEC (sorties : serveurs de noms et DS)      |
| `modules/canonical-redirect` | redirection 301 vers `https://paulperigault.fr` : `.dev` et `www.dev` (ruleset **importé**), `www.fr`                                         |

La limitation de débit du formulaire est dans `modules/contact-form` (seule règle `http_ratelimit` de l'offre gratuite).

**Bascule pilotée par deux variables** (`variables.tf`), changées par une PR à l'étape voulue du runbook, jamais en ligne de commande : `fr_dnssec` (`false`, puis `true` au §4.5) et `fr_site_host` (`github-pages`, puis `cloudflare-pages` au §5 : domaines Pages, `CNAME` proxifiés, enregistrements GitHub supprimés dans le même `apply`).

**Délégation chez OVH** : `infra/registrar/` (brique séparée, son propre state) gère les serveurs de noms et le DS de `paulperigault.fr` (`infra/registrar/README.md`), avec les contrôles `npm run check:dnssec`.

**Dépôt GitHub** : `infra/github/` (brique séparée, son propre state) gère les réglages, protections, variable et environnements de `PaulPerigault/portfolio` (`infra/github/README.md`, ADR-0010).

**Jetons** : `infra/identity/` (brique séparée, son propre state) crée les jetons Cloudflare limités et les comptes de service OVH, avec les seuls jetons d'amorçage ; `infra/` n'utilise ensuite que le jeton limité « terraform » (`infra/identity/README.md`).

Ajouter un service = un nouveau dossier `modules/<service>` (variables, outputs, README) et un bloc `module` dans `main.tf`, sans toucher aux autres.

**Répartition OpenTofu / Wrangler (option A, ADR-0007)** :

- OpenTofu gère le Worker en tant que service, son domaine et le widget Turnstile.
- Wrangler gère le **code** (`wrangler deploy`) et les **secrets** du Worker (`npm run infra:worker-secrets`).
- Pourquoi : le provider v5 n'a pas de ressource de secret autonome. Un secret y serait un binding d'une version du code, donc rejoué contre chaque `wrangler deploy` et stocké dans le state.
- Conséquence : la clé Resend n'entre jamais dans le state. Seul le secret du widget Turnstile y est, parce qu'OpenTofu crée le widget.

## Prérequis

- OpenTofu **1.13.x** (`versions.tf`, ADR-0008 ; Windows : `winget install OpenTofu.Tofu`, macOS : `brew install opentofu`) et provider Cloudflare **5.27.x** de `registry.opentofu.org`, empreintes figées dans `.terraform.lock.hcl` pour Windows, Linux et macOS (`tofu providers lock -platform=windows_amd64 -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64`).
- Node 24 (`.nvmrc`) et `npm ci` à la racine ; `npm ci` dans `worker/` pour Wrangler.
- `infra/.secrets.env` (ignoré par Git), lignes `NOM=valeur`, guillemets englobants acceptés :
  - `TF_VAR_cloudflare_api_token` : token « terraform-portfolio » ;
  - `TF_VAR_resend_api_key` : clé Resend (accès _Sending_, domaine `paulperigault.dev`), lue seulement par `npm run infra:worker-secrets` ;
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` : clés **S3** du bucket R2 du state. Ce sont l'_Access Key ID_ (32 caractères hexadécimaux) et la _Secret Access Key_ (64), pas la valeur du token R2 ; une confusion donne `SignatureDoesNotMatch`. Les noms `AWS_*` sont imposés par le backend `s3` d'OpenTofu ; il n'y a aucun compte AWS.
  - `BOOTSTRAP_CLOUDFLARE`, `BOOTSTRAP_OVH_KEY`, `BOOTSTRAP_OVH_SECRET`, `BOOTSTRAP_OVH_CONSUMER` (facultatifs) : jetons d'amorçage, larges et de courte durée, qui ne servent qu'à créer les jetons limités. Réservés aux commandes de `infra/identity/` (`identityEnv`) ; `childEnv`, utilisé par toutes les autres, les refuse et les retire de l'environnement hérité (`scripts/infra-secrets-bootstrap.test.mjs`). À supprimer une fois les jetons limités créés.
  - `GITHUB_IAC_TOKEN` : jeton GitHub fine-grained limité à `PaulPerigault/portfolio` (90 jours, droits dans `infra/github/README.md`). Réservé à `infra/github/` (`githubEnv`) et à `infra/identity/` (secrets Actions) ; `childEnv` le refuse et le retire de l'environnement hérité (`scripts/infra-secrets-github.test.mjs`).

## Usage

Toujours passer par ces commandes (`scripts/infra-*.mjs`, chargeur `scripts/lib/infra-secrets.mjs`). Chacune charge **seulement** les variables dont elle a besoin, dans l'environnement du seul processus enfant (`tofu`, Wrangler), jamais dans le shell courant. Une variable inconnue dans le fichier fait échouer. Aucune valeur n'est jamais affichée.

| Commande                       | Variables chargées                                                       |
| ------------------------------ | ------------------------------------------------------------------------ |
| `npm run infra:tf`             | token Cloudflare, clés S3 du state                                       |
| `npm run infra:dns`            | token Cloudflare                                                         |
| `npm run infra:github`         | jeton GitHub (`GITHUB_IAC_TOKEN`), clés S3 du state                      |
| `npm run infra:identity`       | jetons d'amorçage (`BOOTSTRAP_*`), jeton GitHub, clés S3 du state        |
| `npm run infra:identity-push`  | clés S3 du state (lit les sorties, écrit le seul fichier de secrets)     |
| `npm run infra:r2-check`       | token Cloudflare                                                         |
| `npm run infra:rulesets`       | token Cloudflare                                                         |
| `npm run infra:worker-secrets` | les quatre (token pour Wrangler, clé Resend, clés S3 pour `tofu output`) |

```shell
npm run infra:tf -- init               # première fois : backend R2
npm run infra:tf -- plan               # lu et relu avant tout apply
npm run infra:tf -- apply              # propriétaire uniquement, jamais en CI
npm run infra:tf -- output contact_form_turnstile_sitekey
npm run infra:dns                      # lecture seule : identifiants DNS pour les imports
npm run infra:r2-check                 # lecture seule : aucun accès public au bucket du state
npm run infra:rulesets                 # lecture seule : rulesets des zones et leur identifiant d'import
npm run infra:tf -- output fr_name_servers   # serveurs de noms à saisir chez OVH
npm run infra:tf -- output fr_dnssec_ds      # DS à saisir chez OVH (après fr_dnssec = true)
npm run infra:worker-secrets           # pose RESEND_API_KEY et TURNSTILE_SECRET sur le Worker (stdin)
```

Ne jamais lancer `tofu show`, `state show|pull`, `console`, ni `output` sans nom de sortie ou en JSON : le secret Turnstile y apparaîtrait. `npm run infra:tf` les refuse lui-même (`scripts/lib/tf-args.mjs`). `output contact_form_turnstile_sitekey` (publique) est sans risque.

En CI, le job `tofu-plan` (#203) lance un vrai `plan` avec un token Cloudflare et des clés R2 **en lecture seule** (secrets `CLOUDFLARE_API_TOKEN_READONLY`, `TFSTATE_R2_READ_ACCESS_KEY_ID`, `TFSTATE_R2_READ_SECRET_KEY`), sans verrou ni apply ; sans ces secrets, il est sauté. Un écart avec l'infrastructure réelle est signalé dans le résumé du job, sans casser la CI.

Sans secrets (CI, vérification locale) : `tofu -chdir=infra init -backend=false`, puis `tofu -chdir=infra validate` et `tofu fmt -recursive -check infra`.

Tests (faux fichiers, doublures de `spawn` et `fetch`, jamais les vrais secrets) : `scripts/infra-secrets.test.mjs` et `scripts/infra-commands.test.mjs`, lancés par `npm test`.

## Bascule Terraform → OpenTofu (propriétaire, une fois, avant tout changement DNS)

Le state actuel a été écrit par Terraform 1.15 ; OpenTofu 1.13 lit ce format (v4). Rien n'est appliqué par cette étape.

1. `tofu version` affiche `OpenTofu v1.13.x`.
2. `npm run infra:tf -- init -reconfigure` : réinitialise `infra/.terraform` avec le provider de `registry.opentofu.org` (empreintes vérifiées contre `.terraform.lock.hcl`) et le même backend R2.
3. `npm run infra:tf -- plan` : résultat attendu « No changes. Your infrastructure matches the configuration. »
4. Si le plan montre un changement : ne rien appliquer, le noter dans l'issue « Actions manuelles » ; retour arrière possible en revenant au commit précédent de `infra/` avec Terraform 1.15 (le state n'a pas été modifié).

## Premier déploiement (propriétaire)

Un domaine personnalisé doit viser un Worker qui existe déjà. La doc du provider ne dit pas si un Worker créé par `cloudflare_worker`, mais jamais déployé, suffit. La séquence retenue évite la question, sans modifier le code :

1. `npm run infra:tf -- apply '-target=module.contact_form.cloudflare_worker.contact' '-target=module.contact_form.cloudflare_turnstile_widget.contact' '-target=module.resend_domain'` : Worker sans code, widget, import des enregistrements Resend, sans le domaine. Les guillemets sont nécessaires sous PowerShell, qui coupe un argument `-target=a.b` non cité au premier point.
2. `npm --prefix worker run deploy`, avec le token Cloudflare dans `CLOUDFLARE_API_TOKEN` : première version du code.
3. `npm run infra:worker-secrets` : secrets du Worker.
4. `npm run infra:tf -- apply` (complet) : le domaine `contact.paulperigault.dev`. Le plan ne doit plus montrer que lui.
5. `gh variable set PUBLIC_TURNSTILE_SITEKEY` avec la sortie `contact_form_turnstile_sitekey`, à la place de la clé de test.

Ensuite, la CI déploie le code ; les secrets ne bougent qu'à une rotation (étape 3).

## State

Backend `s3` vers R2 (`backend.tf`) : bucket `tfstate-portfolio`, créé à la main et **non géré par OpenTofu**. Le state contient un secret, celui du widget Turnstile ; la clé Resend n'y entre pas. Il reste dans R2 et n'est jamais dans le dépôt. `*.tfstate*` et `*.tfplan` sont ignorés : un plan enregistré contient aussi les secrets en clair. Pas de verrou de state : un seul opérateur, aucun `apply` automatique.

### Accès au state (prérequis avant tout `apply`)

Le state contient le secret Turnstile en clair : le bucket ne doit être joignable par **aucun accès public**.

- Vérification automatique, en lecture seule : `npm run infra:r2-check` (code 1 si un accès public existe). Elle demande la permission _Workers R2 Storage : Read_ sur le compte. Le token « terraform-portfolio » ne l'avait pas au 2026-10-13 (`Authentication error`), d'où le contrôle manuel ci-dessous.
- Contrôle manuel dans le dashboard Cloudflare, **R2 → `tfstate-portfolio` → Settings** :
  1. **Public Development URL** (`r2.dev`) : **Disabled** ;
  2. **Custom Domains** : **aucun** domaine connecté ;
  3. **CORS Policy** : vide, puisque le bucket n'est lu que par OpenTofu via l'API S3 ;
  4. **R2 → Manage API tokens** : les clés S3 du state sont limitées à ce bucket (_Object Read & Write_, bucket `tfstate-portfolio` seulement) ;
  5. facultatif : une **Bucket lock rule** ou le versionnement des objets, pour pouvoir revenir à un state précédent en cas de corruption.

## Rotation des tokens

1. Créer le nouveau token ou la nouvelle clé dans Cloudflare, Resend ou R2, avec les **mêmes** permissions minimales.
2. Remplacer la valeur dans `infra/.secrets.env`.
3. `npm run infra:tf -- plan` : le plan doit rester vide. Un changement de token ne modifie aucune ressource.
4. Clé Resend renouvelée, ou widget Turnstile recréé : relancer `npm run infra:worker-secrets` (nouvelle version du Worker, même code).
5. Révoquer l'ancien token.

Permissions du token « terraform-portfolio » (nom conservé, utilisé par OpenTofu) :

- Compte : _Turnstile : Edit_, _Workers Scripts : Edit_, _Cloudflare Pages : Edit_ ; les autres (R2, KV, D1, Queues) servent aux services futurs.
- Ressources de zone : **_All zones from an account_** (le compte du portfolio), pas une zone précise : la zone `paulperigault.fr` est créée par OpenTofu, elle n'existe pas encore quand le token est réglé.
- Zone : _Zone : Edit_ (création de la zone `.fr`), _DNS : Edit_ (enregistrements et DNSSEC), _Workers Routes : Edit_, _Single Redirect : Edit_ (rulesets de redirection), _Zone WAF : Edit_ (limitation de débit), _Zone Settings : Edit_, _Bot Management : Edit_, _Transform Rules : Read_ (pour que `npm run infra:rulesets` voie aussi les Transform Rules).
- Turnstile, Workers Scripts et Pages sont des permissions **de compte** : le token doit inclure le compte, pas seulement la zone.
- Token en lecture seule de la CI (`CLOUDFLARE_API_TOKEN_READONLY`, job `tofu-plan`) : les mêmes en _Read_, sur _All zones from an account_.
- Le déploiement du code en CI utilise un token distinct, limité à _Workers Scripts : Edit_ (`CLOUDFLARE_API_TOKEN_DEPLOY`).
