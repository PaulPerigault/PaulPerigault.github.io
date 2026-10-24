# Brique `google-observability`

Accès **en lecture seule et sans clé** de la CI aux API Google qu'utilise le workflow `web-presence` (`scripts/web-presence/`) : Search Console (indexation de chaque URL du sitemap, état des sitemaps), CrUX (Core Web Vitals réels) et PageSpeed Insights (Lighthouse mobile). Provider `hashicorp/google` **8.8.x**, épinglé, `.terraform.lock.hcl` pour Windows, Linux et macOS. State propre : clé `google-observability/terraform.tfstate` du bucket R2 `tfstate-portfolio` ; il contient la clé d'API et ne quitte jamais R2.

| Fichier              | Contenu                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project.tf`         | projet GCP dédié (`deletion_policy = "PREVENT"`) et API activées : Search Console, PageSpeed Insights, CrUX, plus celles que la fédération exige (IAM, IAM Credentials, STS, API Keys, Service Usage, Resource Manager). Aucune API n'est désactivée à la destruction.                          |
| `service-account.tf` | compte de service `web-presence`. **Aucune clé.** Son seul rôle de projet est `serviceusage.serviceUsageConsumer` (appeler les API activées) : il ne lit ni n'écrit aucune ressource Google Cloud. Ses données Search Console viennent de l'ajout manuel de son e-mail à la propriété.          |
| `wif.tf`             | pool et fournisseur OIDC GitHub Actions, avec deux verrous. **Condition du fournisseur** : dépôt `PaulPerigault/portfolio` (nom et identifiants numériques du dépôt et du propriétaire), workflow `web-presence.yml` sur `refs/heads/develop`, événement `schedule` ou `workflow_dispatch` (jamais une pull request). **Liaison** `workloadIdentityUser` réservée au principal portant exactement ce workflow. |
| `api-key.tf`         | clé d'API restreinte à PageSpeed Insights et CrUX. Volée, elle n'ouvre ni Search Console ni aucune ressource.                                                                                                                                                                                 |
| `outputs.tf`         | `workload_identity_provider`, `service_account_email`, `crux_psi_api_key_secret` (sensible, refusée par les commandes `infra:*`).                                                                                                                                                              |

## Comment la CI obtient un accès

1. Le job `web-presence` reçoit un jeton OIDC de GitHub (`id-token: write`, ce job seulement).
2. `google-github-actions/auth` l'échange auprès du fournisseur ci-dessus : si la condition n'est pas remplie (autre dépôt, autre workflow, autre branche, pull request), Google refuse.
3. Le jeton obtient l'identité du compte de service, avec la seule portée `webmasters.readonly`, pour une heure. Rien n'est stocké.
4. La clé d'API (PageSpeed, CrUX) est un secret GitHub posé par `infra/identity` (`google.tf`) à partir de ce state, derrière l'interrupteur `google_observability`.

## Commandes

```shell
gcloud auth application-default login           # une fois, identifiants du propriétaire, aucun fichier de clé
npm run infra:google -- init
npm run infra:google -- plan -out=google.tfplan
npm run infra:google -- apply google.tfplan     # propriétaire seul, plan enregistré et relu
```

`infra:google` charge les clés S3 du state, jamais un jeton d'amorçage ni de clé Google : elle refuse de démarrer si `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CREDENTIALS` ou une variable équivalente désigne une clé. Elle refuse aussi, comme les autres briques, `destroy`, `-destroy`, un `apply` sans plan `*.tfplan`, un plan qui détruit une ressource absente de `allowed-destroys.txt` et toute sortie dont le nom contient `secret`, `token` ou `client` (`scripts/lib/tf-args.mjs`). Étapes complètes : `docs/manual-steps.md`.

## Tests

`tofu test` (provider simulé, `tests/google_observability.tftest.hcl`) : API activées, projet protégé, condition de fédération (dépôt, identifiants, workflow, branche, événements), liaison au workflow exact, rôle unique, clé d'API limitée à deux API, variables validées. `scripts/infra-google-observability.test.mjs` : aucune clé de compte de service, workflow existant, secrets de `infra/identity` égaux à ceux que lit le workflow, CI et lock file.
