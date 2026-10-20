# Brique `identity`

Crée les **jetons limités** dont se servent `infra/` et `infra/registrar/`, puis les distribue sans jamais les afficher. C'est la seule brique authentifiée avec les jetons d'amorçage (`BOOTSTRAP_*` du fichier de secrets, larges, de courte durée, restreints à l'IP du propriétaire). State propre : clé `identity/terraform.tfstate` du bucket R2 `tfstate-portfolio`. Il contient les valeurs des jetons et ne quitte jamais R2.

| Ressource                                                                        | Usage                                                                                                                               | Droits                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_account_token.limited["terraform"]`                                  | `infra/` en local                                                                                                                   | compte : Turnstile, Workers Scripts, Pages (écriture) ; toutes les zones du compte : Zone, DNS, Workers Routes, Dynamic URL Redirects, Zone WAF, Zone Settings, Bot Management (écriture), Transform Rules (lecture) |
| `cloudflare_account_token.limited["pages_deploy"]`                               | CI, envoi de `dist/` (`CLOUDFLARE_API_TOKEN_PAGES`)                                                                                 | compte : Pages (écriture), rien d'autre                                                                                                                                                                              |
| `cloudflare_account_token.limited["ci_readonly"]`                                | CI, `tofu plan` de `infra/` (`CLOUDFLARE_API_TOKEN_READONLY`)                                                                       | les mêmes que `terraform`, en lecture seule                                                                                                                                                                          |
| `cloudflare_account_token.state_read` (`r2.tf`)                                  | CI, lecture du state (`TFSTATE_R2_READ_ACCESS_KEY_ID`, `TFSTATE_R2_READ_SECRET_KEY` : identifiant du jeton et SHA-256 de sa valeur) | bucket `tfstate-portfolio` seul : _Workers R2 Storage Bucket Item Read_                                                                                                                                              |
| `ovh_me_api_oauth2_client.registrar["write"]` + `ovh_iam_policy.registrar_write` | `infra/registrar/` en local (`OVH_CLIENT_ID`, `OVH_CLIENT_SECRET`)                                                                  | domaine `paulperigault.fr` seul : `nameServer/get`, `nameServer/edit`, `dsRecord/get`, `dsRecord/create`, `task/get`, **depuis l'IP du propriétaire**                                                                |
| `ovh_me_api_oauth2_client.registrar["read"]` + `ovh_iam_policy.registrar_read`   | CI, plan planifié de `infra/registrar/` (`OVH_READ_CLIENT_ID`, `OVH_READ_CLIENT_SECRET`)                                            | domaine `paulperigault.fr` seul : `nameServer/get`, `dsRecord/get`                                                                                                                                                   |

Les actions OVH sont exactement celles qu'appellent `ovh_domain_name_servers` et `ovh_domain_ds_records` (code du provider 2.22.0). Aucun droit sur `authInfo`, le transfert, le titulaire ni les contacts, aucun joker (`tofu test` le vérifie). Les jetons Cloudflare expirent au bout d'un an (`token_expires_on`).

Le provider OVH appelle `/auth/details` au démarrage. Si IAM le refuse à un compte de service, `infra/registrar/` doit passer `ignore_init_error = true` à son provider.

## Commandes

```shell
npm run infra:identity -- init
npm run infra:identity -- plan -out=identity.tfplan   # relève l'IP publique (cloudflare.com/cdn-cgi/trace)
npm run infra:identity -- apply identity.tfplan        # seulement un plan enregistré et relu
npm run infra:identity-push                            # fichier de secrets + secrets GitHub, valeurs jamais affichées
```

`infra:identity` est la seule commande qui charge les `BOOTSTRAP_*` (`identityEnv`, `scripts/lib/infra-secrets.mjs`). Elle refuse, comme `infra:tf`, toute destruction, tout `apply` sans plan enregistré et toute sortie de jeton (`scripts/lib/tf-args.mjs`). `infra:identity-push` écrit `TF_VAR_cloudflare_api_token`, `OVH_CLIENT_ID` et `OVH_CLIENT_SECRET` dans le fichier de secrets local, puis pose six secrets GitHub par l'entrée standard de `gh secret set` (dont les clés S3 du state en lecture seule). Seuls les noms sont affichés.

## Rotation et fin des jetons d'amorçage

Rotation : `plan` puis `apply` après avoir avancé `token_expires_on`, ou après un changement d'IP (politique d'écriture d'OVH), puis `infra:identity-push`. Une fois les jetons limités en place, les `BOOTSTRAP_*` sont supprimés par le propriétaire, chez Cloudflare et chez OVH, puis retirés du fichier de secrets.

## Toute modification future : jetons de départ temporaires

Une fois les `BOOTSTRAP_*` supprimés, **tout** `plan` ou `apply` de cette brique (nouveau jeton, rotation, changement d'IP, changement de droits) demande de recréer des jetons de départ temporaires. Ils sont créés par le propriétaire, utilisés le temps d'un `plan` relu puis d'un `apply`, puis supprimés.

| Variable du fichier de secrets                                        | Où la créer                                                                                                      | Droits, et rien d'autre                                                                                                                                                                                                                | Durée               | Restriction                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| `BOOTSTRAP_CLOUDFLARE`                                                | Cloudflare, _Manage Account → Account API Tokens → Create Token → Custom_ (jeton **de compte**, pas utilisateur) | compte du portfolio : _Account → Account API Tokens → Edit_ (lister les groupes de permissions, créer, modifier et supprimer les jetons de compte)                                                                                     | 1 jour (_TTL_)      | _Client IP Address Filtering_ : l'IP publique du propriétaire |
| `BOOTSTRAP_OVH_KEY`, `BOOTSTRAP_OVH_SECRET`, `BOOTSTRAP_OVH_CONSUMER` | https://eu.api.ovh.com/createToken/                                                                              | `GET`, `POST`, `PUT` sur `/me/api/oauth2/client` et `/me/api/oauth2/client/*`, `/iam/policy` et `/iam/policy/*` ; `GET /auth/details` ; `DELETE` sur les mêmes chemins **seulement** si `allowed-destroys.txt` liste une ressource OVH | 1 jour (_Validity_) | _Authorized IPs_ : l'IP publique du propriétaire              |

- Le chargeur (`identityEnv`) exige les **quatre** noms `BOOTSTRAP_*`, même pour un changement qui ne touche que Cloudflare : le provider OVH doit pouvoir lire l'état de ses ressources.
- L'IP publique est celle que `npm run infra:identity -- plan` relève (`cloudflare.com/cdn-cgi/trace`) ; elle sert aussi à la politique d'écriture d'OVH.
- Ensuite : `npm run infra:identity-push` si une sortie a changé, puis suppression des jetons temporaires (Cloudflare : page _Account API Tokens_ ; OVH : `DELETE /me/api/application/{applicationId}`, identifiant donné par `GET /auth/currentCredential`), et retrait des quatre lignes du fichier de secrets.
