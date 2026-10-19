# ADR-0008 — OpenTofu et hébergement sur Cloudflare Pages, sans Docker

- **Statut** : accepté pour le code (lot 9, #179) ; la bascule réelle (apply, DNS) reste une action du propriétaire (`docs/runbook-cloudflare.md`).

## Contexte

- L'infrastructure (`infra/`) était décrite en Terraform 1.15. Le propriétaire a décidé de passer à OpenTofu (licence ouverte, même langage), maintenant et isolément, avant tout autre changement d'infrastructure.
- Le site est servi par GitHub Pages, qui n'envoie **aucun** en-tête HTTP : `frame-ancestors`, HSTS, COOP/CORP et `X-Frame-Options` n'existaient que dans une image Docker + nginx qui n'était déployée nulle part (vérifiée par un script de contrôle du conteneur en CI, 35 s par run).
- La zone `paulperigault.dev` et les services (Worker du formulaire, Turnstile, R2 du state) sont déjà chez Cloudflare ; le domaine canonique `paulperigault.fr` est chez OVH (serveurs de noms OVH au 2026-10-19, `npm run check:dns`).

## Décision

- **OpenTofu 1.13.x** à la place de Terraform : même code HCL (bloc `terraform`), provider Cloudflare 5.27.x depuis `registry.opentofu.org`, `.terraform.lock.hcl` régénéré par `tofu providers lock` (Windows, Linux, macOS, signature vérifiée). CI : `opentofu/setup-opentofu` épinglé par SHA, `tofu fmt -check`, `validate` et `tofu test` (provider simulé). Les commandes `infra:*` (scripts npm) lancent `tofu` ; le nom `infra:tf` est conservé (règles `deny` et habitudes). Le premier `plan` du propriétaire doit donner « No changes » avant toute autre étape.
- **Cloudflare Pages en envoi direct** (`infra/modules/pages-site`) : un projet **sans source Git**. La CI enverra l'artefact `dist/` déjà construit et testé, comme aujourd'hui vers GitHub Pages (« construit une fois, testé, déployé tel quel »). Écartés : le build par Cloudflare depuis Git (deuxième build, non testé par la CI) ; Workers avec assets statiques (plus de configuration pour un site sans code serveur).
- **En-têtes dans `public/_headers`** (format Pages), testés par `scripts/pages-headers.test.mjs` avec les règles de correspondance de Pages : ceux de nginx, plus CORP et `Permissions-Policy` sans `interest-cohort` (obsolète). HSTS **sans `includeSubDomains`** : tous les sous-domaines du `.fr` (OVH) ne sont pas en HTTPS. GitHub Pages ignore ce fichier : il est sans effet tant que la bascule n'est pas faite.
- **Docker supprimé** une fois les en-têtes portés et testés : `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.dockerignore`, le script de contrôle du conteneur, le job CI `container`, entrée Dependabot Docker. Un test (`scripts/hosting.test.mjs`) empêche leur retour, ainsi que tout script shell.
- **DNS du `.fr` hors du code** : déplacer les serveurs de noms d'OVH vers Cloudflare touche aussi la messagerie iCloud (MX, SPF, DKIM). C'est une action manuelle, décrite pas à pas, et vérifiée par `npm run check:dns` (DNS public, lecture seule, sans secret).

## Conséquences

- Un outil de moins (Docker) et un job CI de moins ; plus aucun script shell, outillage identique sous Windows, macOS et Linux.
- Tant que la bascule n'est pas faite, le site réel reste sur GitHub Pages **sans en-tête de sécurité HTTP** : le `.fr` n'est pas derrière Cloudflare (serveurs de noms OVH, `npm run check:dns`), donc la règle de `docs/infra.md` §3 ne peut pas s'appliquer ; `public/_headers` est publié sans effet. Seule la CSP en balise meta protège les pages d'ici là.
- Le déploiement vers Pages (`wrangler pages deploy dist`, token limité à _Cloudflare Pages : Edit_) sera ajouté à `deploy.yml` après le premier `apply` du module, avec son test.
