# ADR-0008 — OpenTofu et hébergement sur Cloudflare Pages, sans Docker

- **Statut** : accepté pour le code (lot 9, #179) ; **amendé le 2026-10-19** : la zone DNS de `paulperigault.fr` passe chez Cloudflare et en OpenTofu (voir « Amendement »). Les `apply` et les actions chez OVH restent celles du propriétaire (`docs/runbook-cloudflare.md`).

## Contexte

- L'infrastructure (`infra/`) était décrite en Terraform 1.15. Le propriétaire a décidé de passer à OpenTofu (licence ouverte, même langage), maintenant et isolément, avant tout autre changement d'infrastructure.
- Le site est servi par GitHub Pages, qui n'envoie **aucun** en-tête HTTP : `frame-ancestors`, HSTS, COOP/CORP et `X-Frame-Options` n'existaient que dans une image Docker + nginx qui n'était déployée nulle part (vérifiée par un script de contrôle du conteneur en CI, 35 s par run).
- La zone `paulperigault.dev` et les services (Worker du formulaire, Turnstile, R2 du state) sont déjà chez Cloudflare ; le domaine canonique `paulperigault.fr` est chez OVH (serveurs de noms OVH au 2026-10-19, `npm run check:dns`).

## Décision

- **OpenTofu 1.13.x** à la place de Terraform : même code HCL (bloc `terraform`), provider Cloudflare 5.27.x depuis `registry.opentofu.org`, `.terraform.lock.hcl` régénéré par `tofu providers lock` (Windows, Linux, macOS, signature vérifiée). CI : `opentofu/setup-opentofu` épinglé par SHA, `tofu fmt -check`, `validate` et `tofu test` (provider simulé). Les commandes `infra:*` (scripts npm) lancent `tofu` ; le nom `infra:tf` est conservé (règles `deny` et habitudes). Le premier `plan` du propriétaire doit donner « No changes » avant toute autre étape.
- **Cloudflare Pages en envoi direct** (`infra/modules/pages-site`) : un projet **sans source Git**. La CI enverra l'artefact `dist/` déjà construit et testé, comme aujourd'hui vers GitHub Pages (« construit une fois, testé, déployé tel quel »). Écartés : le build par Cloudflare depuis Git (deuxième build, non testé par la CI) ; Workers avec assets statiques (plus de configuration pour un site sans code serveur).
- **En-têtes dans `public/_headers`** (format Pages), testés par `scripts/pages-headers.test.mjs` avec les règles de correspondance de Pages : ceux de nginx, plus CORP et `Permissions-Policy` sans `interest-cohort` (obsolète). HSTS **sans `includeSubDomains`** : tous les sous-domaines du `.fr` (OVH) ne sont pas en HTTPS. GitHub Pages ignore ce fichier : il est sans effet tant que la bascule n'est pas faite.
- **Docker supprimé** une fois les en-têtes portés et testés : `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.dockerignore`, le script de contrôle du conteneur, le job CI `container`, entrée Dependabot Docker. Un test (`scripts/hosting.test.mjs`) empêche leur retour, ainsi que tout script shell.
- ~~**DNS du `.fr` hors du code**~~ : remplacé par l'amendement ci-dessous. Le changement de serveurs de noms reste manuel (registrar), vérifié par `npm run check:dns` (DNS public, lecture seule, sans secret).

## Conséquences

- Un outil de moins (Docker) et un job CI de moins ; plus aucun script shell, outillage identique sous Windows, macOS et Linux.
- Tant que la bascule n'est pas faite, le site réel reste sur GitHub Pages **sans en-tête de sécurité HTTP** : le `.fr` n'est pas derrière Cloudflare (serveurs de noms OVH, `npm run check:dns`), donc la règle de `docs/infra.md` §3 ne peut pas s'appliquer ; `public/_headers` est publié sans effet. Seule la CSP en balise meta protège les pages d'ici là.
- Le déploiement vers Pages (`wrangler pages deploy dist`, token limité à _Cloudflare Pages : Edit_) sera ajouté à `deploy.yml` après le premier `apply` du module, avec son test.

## Amendement du 2026-10-19 — zone `.fr` chez Cloudflare, en OpenTofu

### Contexte

La bascule préparée par #181 se faisait au tableau de bord Cloudflare : recopie à la main de la zone OVH (messagerie iCloud, vérifications), DNSSEC, `CNAME` vers Pages, redirection `www.fr` → apex, limitation de débit du formulaire, correction de la redirection `.dev` (le `www` n'était pas couvert). Une quinzaine de saisies sans revue ni test, sur la messagerie et sur DNSSEC, là où une erreur coupe le site et l'e-mail.

### Décision

- **La zone `paulperigault.fr` est créée et gérée par OpenTofu** (`infra/modules/zone-fr`) : enregistrements recopiés d'OVH en DNS seul (TXT Google corrigé : jeton une fois), obfuscation des e-mails et Rocket Loader coupés, robots d'IA non bloqués, DNSSEC piloté par `fr_dnssec` (`false` par défaut), sorties `fr_name_servers` et `fr_dnssec_ds`. Tant que les serveurs de noms restent ceux d'OVH, la zone est `pending` : l'appliquer est sans effet public.
- **OVH reste le registrar** ; ses actions restent manuelles, et il n'en reste que trois : couper DNSSEC, remplacer les serveurs de noms, publier le DS.
- **Domaines personnalisés en IaC** (reprise de #229) : `fr_site_host = "cloudflare-pages"` déclare les domaines du projet Pages, crée les `CNAME` `@` et `www` proxifiés et supprime les enregistrements GitHub dans le même `apply`. Un `CNAME` ne coexiste pas avec un `A` du même nom : `depends_on` impose « détruire puis créer » (arête `création → destruction` mesurée avec `tofu graph -plan` ; sans `depends_on`, aucune arête, donc aucun ordre garanti).
- **Rulesets en IaC** : une redirection 301 réutilisable (`modules/canonical-redirect`, deux usages : `.dev` + `www.dev`, et `www.fr`) ; la redirection `.dev` créée à la main est **importée** (un seul ruleset par phase et par zone). La limitation de débit (`modules/contact-form`) suit l'offre gratuite : 1 règle, filtre sur le chemin seulement, 10 s de période et de blocage. La _Transform Rule_ d'en-têtes de `docs/infra.md` §3 est **abandonnée** : `public/_headers` la remplace.
- Les deux variables de bascule changent par **PR**, à l'étape voulue du runbook, pour que le `plan` relu et la CI voient la même valeur.

### Conséquences

- Le token « terraform-portfolio » s'élargit à toutes les zones du compte (la zone `.fr` n'existe pas avant l'`apply`) et gagne _Zone_, _Single Redirect_, _Zone WAF_, _Zone Settings_ et _Bot Management_ (`infra/README.md`, « Rotation des tokens »).
- Le state contient désormais la zone `.fr` (aucun secret de plus : tout y est publié en DNS).
- `tofu test` couvre chaque module avec un provider simulé ; la racine ne peut pas être testée ainsi tant qu'elle porte des blocs `import` (OpenTofu 1.13 refuse l'import en contexte de test).
- Retour arrière : avant la publication du DS, remettre les serveurs de noms d'OVH suffit (la zone OVH n'est jamais supprimée).
