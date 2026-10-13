# ADR-0007 — Formulaire de contact : Worker Cloudflare, Turnstile, Resend, Terraform

- **Statut** : accepté (épic #133)

## Contexte

Le site est un document statique sur GitHub Pages : zéro JS par défaut, CSP `default-src 'none'`, aucun tiers, tout fonctionne sans JavaScript. Le propriétaire veut un formulaire de contact en plus du lien `mailto:`, et une base réutilisable pour d'autres services (Cloudflare ou auto-hébergés). Le domaine canonique `paulperigault.fr` est chez OVH, et sa boîte iCloud dépend de ses enregistrements MX/SPF/DKIM. La zone `paulperigault.dev` est chez Cloudflare.

## Décision

- **Un Worker Cloudflare** (`worker/`, brique autonome) sur `contact.paulperigault.dev` :
  - validation serveur, CORS à origines exactes (jamais `*`), piège à robots ;
  - vérification **Turnstile** avant tout envoi ;
  - envoi par **Resend** (région UE) en texte brut, avec le visiteur en `reply_to` ;
  - rien n'est stocké ni journalisé.
- Écartés :
  - un formulaire tiers (Formspree…) : un tiers de plus qui conserve les messages ;
  - un service SMTP sur le `.fr` : il faudrait toucher au DNS d'OVH et à la boîte iCloud ;
  - un backend auto-hébergé : il faudrait un serveur à maintenir pour quelques messages par mois (voir `docs/pistes-rust-go.md`).
- **Turnstile chargé au premier focus** dans le formulaire, jamais au chargement de la page. Sans interaction, la page reste sans tiers, comme avant.
- **Mesure réelle** (`e2e/measure-turnstile.spec.ts`, opt-in) : aucun cookie, stockage du site intact, zéro violation de CSP.
- **CSP ouverte par page** (`lib/contact-csp.ts`) :
  - `script-src` et `frame-src` vers Turnstile, `connect-src` vers le Worker et Turnstile ;
  - seulement sur `/fr/` et `/en/`, les autres pages restent strictes ;
  - l'appel doit venir du frontmatter de la **page** : depuis un composant du `<body>`, il est ignoré sans erreur.
- **Couche `components/interactive`** : le seul endroit, avec `layout`, autorisé à importer `src/scripts`. Les sections restent sans JavaScript, et l'endroit où le JS entre dans les composants est explicite.
- **Sans JavaScript, ou sans clé de site au build** : pas de formulaire, le `mailto:` reste la voie de contact.
- **Terraform**, un module par service (`infra/modules/contact-form`, `infra/modules/resend-domain`) :
  - state dans R2 ;
  - enregistrements Resend **importés**, pas recréés ;
  - pas d'`apply` en CI, seul le propriétaire en lance.
- **Répartition Terraform / Wrangler — option A** :
  - Terraform gère le Worker comme _service_ (`cloudflare_worker`, sans code), son domaine et le widget ;
  - Wrangler gère le **code** (`wrangler deploy`, token limité à _Workers Scripts : Edit_) et les **secrets** (`wrangler secret bulk` sur stdin, `infra/contact-form-secrets.ps1`).
  - Raison : le provider v5.27 n'a **aucune ressource de secret autonome**. Un secret y est un binding d'une version du code (`worker_version` ou `workers_script`), donc stocké dans le state et réécrit à chaque `apply`, alors que `wrangler deploy` le conserve. Cloudflare documente ce découpage (`cloudflare_worker` seul, versions et déploiements par Wrangler).

## Options écartées pour les secrets

- **B — tout dans Terraform** (`worker_version` + `workers_deployment`) :
  - une seule source de vérité ;
  - mais tous les secrets dans le state, un build Wrangler obligatoire avant chaque `apply`, chaque `wrangler deploy` annulé au `apply` suivant, et un token complet pour la CI.
- **C — Secrets Store** (`cloudflare_secrets_store_secret`, lié par binding) : déclaratif et indépendant du code, mais demande des permissions supplémentaires et une vérification de la conservation de la valeur dans le state. Noté dans `ROADMAP.md`.

## Conséquences

- (+) Le site reste statique : aucun tiers à l'ouverture des pages, budget JS inchangé (`bundle-budget`), la CSP ne s'ouvre qu'à deux origines et sur deux pages.
- (+) Chaque brique se teste seule :
  - Worker : tests unitaires, `fetch` injecté ;
  - formulaire : e2e avec Worker et Turnstile simulés ;
  - infrastructure : `fmt` et `validate` ; chargeur de secrets testé avec de faux fichiers.
- (+) La clé Resend n'entre jamais dans le state.
- (−) Les secrets du Worker ne sont pas déclarés dans Terraform : ils se reposent avec `contact-form-secrets.ps1` à chaque rotation. Le secret Turnstile, lui, est dans le state, parce que Terraform crée le widget.
- (−) Un tiers (Cloudflare Turnstile) intervient quand le visiteur utilise le formulaire. La page légale l'explique, et des `TODO` restent à compléter par le propriétaire avant la production (`ROADMAP.md`).
- (−) Premier déploiement en plusieurs étapes : un domaine personnalisé doit viser un Worker existant (séquence dans `infra/README.md`).
