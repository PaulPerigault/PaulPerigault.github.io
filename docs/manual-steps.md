# Étapes manuelles : présence en ligne (Google et Bing)

Ces étapes sont les tiennes, Paul : l'assistant ne lance aucun `apply`, ne crée aucun secret GitHub et n'a pas accès à Search Console ni à Bing. Tant qu'elles ne sont pas faites, le workflow `web-presence` reste vert : les vérifications Search Console, Bing, Core Web Vitals et Lighthouse apparaissent « NON CONFIGURÉ » dans le rapport, sans échec. Les autres vérifications (fichiers, redirections, liens, données structurées, en-têtes, TLS, DNS) tournent déjà.

Ordre : 1 → 2 → 3 → 4 → 5 → 6 → 7. Les étapes 5 et 6 (Bing) sont indépendantes de 1 à 4 (Google).

## 0. Avant de commencer

- La PR qui ajoute le workflow est fusionnée dans `develop`. Le workflow doit exister sur `develop` : c'est la branche des exécutions planifiées, et la seule que la fédération d'identité Google accepte (`infra/google-observability/variables.tf`, `workflow_ref`). Un lancement manuel depuis une autre branche s'exécute mais Google refuse son jeton.
- `gcloud` installé : `brew install --cask gcloud-cli` (ou https://cloud.google.com/sdk/docs/install).
- Le fichier de secrets local `infra/.secrets.env` contient déjà `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` (clés S3 du state), comme pour les autres briques. Rien d'autre n'est ajouté à ce fichier.

## 1. Connexion Google, sans clé

```shell
gcloud auth application-default login
```

Connecte-toi avec le compte Google qui possédera le projet. Aucun fichier de clé n'est créé dans le dépôt : les identifiants restent dans ton profil `gcloud`. `npm run infra:google` refuse de démarrer si `GOOGLE_APPLICATION_CREDENTIALS` (ou une autre variable désignant une clé de compte de service) est définie.

## 2. Plan puis apply de `infra/google-observability`

```shell
npm run infra:google -- init
npm run infra:google -- plan -out=google.tfplan
```

Relis le plan avant d'appliquer. Attendu : **16 ressources à créer, 0 à modifier, 0 à détruire** : le projet `paulperigault-observability`, 9 API (Search Console, PageSpeed Insights, CrUX, Service Usage, Resource Manager, IAM, IAM Credentials, STS, API Keys), le compte de service `web-presence`, son unique rôle `serviceusage.serviceUsageConsumer`, le pool et le fournisseur de fédération, la liaison `workloadIdentityUser` et la clé d'API restreinte à PageSpeed et CrUX. Aucune clé de compte de service.

Si le plan est conforme :

```shell
npm run infra:google -- apply google.tfplan
```

Problèmes possibles, sans danger :

- `project_id` déjà pris (les identifiants sont uniques dans le monde entier) : change `project_id` dans `infra/google-observability/variables.tf` par PR, puis refais le plan.
- Google exige un compte de facturation pour activer une API : renseigne `billing_account` par PR (les API utilisées sont gratuites).
- Le plan est enregistré dans `google.tfplan` (ignoré par Git) : il contient des valeurs sensibles, ne le partage pas.

Relève ensuite l'e-mail du compte de service (non secret) :

```shell
npm run infra:google -- output service_account_email
```

Il ressemble à `web-presence@paulperigault-observability.iam.gserviceaccount.com`. La clé d'API (`crux_psi_api_key_secret`) n'est jamais affichée : les commandes `infra:*` refusent ce nom.

## 3. Poser les secrets GitHub (infra/identity)

L'IaC existante d'identité copie la clé d'API, le fournisseur de fédération et l'e-mail du compte de service dans trois secrets Actions : `GOOGLE_API_KEY`, `GOOGLE_WORKLOAD_IDENTITY_PROVIDER`, `GOOGLE_SERVICE_ACCOUNT`.

1. Ouvre une PR qui passe `google_observability` de `false` à `true` dans `infra/identity/variables.tf` et fais-la fusionner.
2. Prépare l'accès d'identité comme pour toute modification de cette brique (jetons de départ temporaires et `GITHUB_IAC_TOKEN` avec le droit _Secrets : write_) : suis `infra/identity/README.md`, section « Toute modification future ».
3. Plan puis apply :

```shell
npm run infra:identity -- plan -out=identity.tfplan
npm run infra:identity -- apply identity.tfplan
```

Attendu : 3 ressources `github_actions_secret.google[...]` à créer, rien d'autre. Vérifie les noms (les valeurs ne s'affichent jamais) :

```shell
gh secret list --repo PaulPerigault/portfolio
```

4. Supprime les jetons de départ temporaires, comme l'indique le README d'identité.

## 4. Ajouter le compte de service à Search Console

1. Ouvre [Search Console](https://search.google.com/search-console) avec le compte propriétaire de la propriété `paulperigault.fr`.
2. Sélectionne la propriété de domaine `paulperigault.fr` (vérifiée par DNS, `docs/infra.md`) ; à défaut, `https://paulperigault.fr/`. Le contrôle reconnaît les deux.
3. _Paramètres_ → _Utilisateurs et autorisations_ → _Ajouter un utilisateur_.
4. Colle l'e-mail du compte de service relevé à l'étape 2 (`…@paulperigault-observability.iam.gserviceaccount.com`).
5. Autorisation : _Restreint_ (lecture seule). Si l'inspection d'URL répond ensuite `HTTP 403` dans le rapport, passe-le en _Complet_ : le jeton du workflow reste en lecture seule dans tous les cas (portée `webmasters.readonly`).

Les libellés peuvent varier légèrement selon la langue de l'interface. Tant que cette étape manque, la vérification Search Console reste « NON CONFIGURÉ » avec la mention « compte de service absent de Search Console ».

## 5. Importer le site dans Bing depuis Search Console

1. Ouvre [Bing Webmaster Tools](https://www.bing.com/webmasters) et connecte-toi.
2. _Ajouter un site_ → _Importer depuis Google Search Console_.
3. Autorise l'accès avec le compte Google de l'étape 4, choisis la propriété `paulperigault.fr`, puis _Importer_. Bing reprend la vérification de propriété et le sitemap : rien à ajouter dans le site (la balise `PUBLIC_BING_SITE_VERIFICATION` reste facultative).
4. Vérifie que le site apparaît comme _vérifié_ dans la liste.

## 6. Créer la clé d'API Bing et la poser en secret

Aucune API ne crée cette clé : elle est manuelle et n'est pas dans l'IaC.

1. Bing Webmaster Tools → _Paramètres_ (engrenage) → _Accès à l'API_ → _Clé d'API_ → _Générer la clé d'API_ (une clé par utilisateur, valable pour tous tes sites vérifiés). Accepte d'abord les conditions si c'est la première fois.
2. Pose-la en secret du dépôt sans la laisser dans l'historique du shell : la commande demande la valeur sur l'entrée standard.

```shell
gh secret set BING_WEBMASTER_API_KEY --repo PaulPerigault/portfolio
```

Si la clé fuite : supprime-la dans Bing Webmaster Tools, génère-en une autre et relance la commande ci-dessus.

## 7. Lancer le contrôle et lire le rapport

```shell
gh workflow run web-presence.yml --repo PaulPerigault/portfolio --ref develop
```

Puis ouvre le run dans l'onglet _Actions_ : le rapport est dans le résumé du run et dans l'artefact `web-presence-report`. Attendu une fois les étapes 1 à 6 faites : plus aucune ligne « NON CONFIGURÉ ». En cas d'échec, une seule issue « Présence en ligne : le contrôle hebdomadaire a échoué » s'ouvre ; elle se referme d'elle-même au retour au vert.

En local, sans aucun secret (les vérifications Google et Bing restent « non configuré ») :

```shell
npm run check:web
npm run check:web -- --only=links,tls
```

Le rapport est écrit dans `web-presence-report.md` (ignoré par Git).

## Ce qui n'a pas pu être vérifié par l'assistant

- Aucun `plan` réel de `infra/google-observability` : il demande tes identifiants Google. La configuration est validée (`tofu validate`) et testée avec un fournisseur simulé (`tofu test`).
- Les appels à Search Console, CrUX, PageSpeed Insights et Bing ont été testés avec de fausses réponses, pas avec de vrais comptes. La forme des réponses suit la documentation de chaque API ; le premier run réel, à l'étape 7, est le vrai test.
- Le noindex de `pages.dev` est signalé « ÉCHEC » tant que la PR #272 n'est pas déployée en production.
