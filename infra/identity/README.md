# Brique `identity`

Crée les **jetons limités** dont se servent `infra/` et `infra/registrar/`, puis les distribue sans jamais les afficher. C'est la seule brique authentifiée avec les jetons d'amorçage (`BOOTSTRAP_*` du fichier de secrets, larges, de courte durée, restreints à l'IP du propriétaire). State propre : clé `identity/terraform.tfstate` du bucket R2 `tfstate-portfolio`. Il contient les valeurs des jetons et ne quitte jamais R2.

| Ressource                                                                        | Usage                                                                                    | Droits                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_account_token.limited["terraform"]`                                      | `infra/` en local                                                                        | compte : Turnstile, Workers Scripts, Pages (écriture) ; toutes les zones du compte : Zone, DNS, Workers Routes, Dynamic URL Redirects, Zone WAF, Zone Settings, Bot Management (écriture), Transform Rules (lecture) |
| `cloudflare_account_token.limited["pages_deploy"]`                                   | CI, envoi de `dist/` (`CLOUDFLARE_API_TOKEN_PAGES`)                                      | compte : Pages (écriture), rien d'autre                                                                                                                                                                              |
| `cloudflare_account_token.limited["ci_readonly"]`                                    | CI, `tofu plan` de `infra/` (`CLOUDFLARE_API_TOKEN_READONLY`)                            | les mêmes que `terraform`, en lecture seule                                                                                                                                                                          |
| `ovh_me_api_oauth2_client.registrar["write"]` + `ovh_iam_policy.registrar_write` | `infra/registrar/` en local (`OVH_CLIENT_ID`, `OVH_CLIENT_SECRET`)                       | domaine `paulperigault.fr` seul : `nameServer/get`, `nameServer/edit`, `dsRecord/get`, `dsRecord/create`, `task/get`, **depuis l'IP du propriétaire**                                                                |
| `ovh_me_api_oauth2_client.registrar["read"]` + `ovh_iam_policy.registrar_read`   | CI, plan planifié de `infra/registrar/` (`OVH_READ_CLIENT_ID`, `OVH_READ_CLIENT_SECRET`) | domaine `paulperigault.fr` seul : `nameServer/get`, `dsRecord/get`                                                                                                                                                   |

Les actions OVH sont exactement celles qu'appellent `ovh_domain_name_servers` et `ovh_domain_ds_records` (code du provider 2.22.0). Aucun droit sur `authInfo`, le transfert, le titulaire ni les contacts, aucun joker (`tofu test` le vérifie). Les jetons Cloudflare expirent au bout d'un an (`token_expires_on`).

Le provider OVH appelle `/auth/details` au démarrage. Si IAM le refuse à un compte de service, `infra/registrar/` doit passer `ignore_init_error = true` à son provider.

## Commandes

```shell
npm run infra:identity -- init
npm run infra:identity -- plan -out=identity.tfplan   # relève l'IP publique (cloudflare.com/cdn-cgi/trace)
npm run infra:identity -- apply identity.tfplan        # seulement un plan enregistré et relu
npm run infra:identity-push                            # fichier de secrets + secrets GitHub, valeurs jamais affichées
```

`infra:identity` est la seule commande qui charge les `BOOTSTRAP_*` (`identityEnv`, `scripts/lib/infra-secrets.mjs`). Elle refuse, comme `infra:tf`, toute destruction, tout `apply` sans plan enregistré et toute sortie de jeton (`scripts/lib/tf-args.mjs`). `infra:identity-push` écrit `TF_VAR_cloudflare_api_token`, `OVH_CLIENT_ID` et `OVH_CLIENT_SECRET` dans le fichier de secrets local, puis pose quatre secrets GitHub par l'entrée standard de `gh secret set`. Seuls les noms sont affichés.

## Rotation et fin des jetons d'amorçage

Rotation : `plan` puis `apply` après avoir avancé `token_expires_on`, ou après un changement d'IP (politique d'écriture d'OVH), puis `infra:identity-push`. Une fois les jetons limités en place, les `BOOTSTRAP_*` sont supprimés par le propriétaire, chez Cloudflare et chez OVH, puis retirés du fichier de secrets.
