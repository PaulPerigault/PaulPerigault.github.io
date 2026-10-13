# Roadmap

Évolutions envisagées au-delà du travail courant. Cadrage uniquement : rien n'est implémenté tant qu'un point n'a pas été repris dans une issue.

## En attente de décision du propriétaire

- **En-têtes de sécurité réels pour le site GitHub Pages** : mettre un proxy qui sait poser des en-têtes devant Pages (Cloudflare Transform Rules ou Worker) pour `frame-ancestors`, HSTS, COOP/CORP… Voir ADR-0004 et la section Sécurité de `CLAUDE.md`. Décision d'infrastructure (DNS, tiers).
- **Actions GEO manuelles** : Search Console, Bing Webmaster, alignement des profils LinkedIn/GitHub, contrôles mensuels auprès des assistants (`docs/geo-checklist.md`).

## Avant la mise en production du formulaire de contact (épic #133)

Rien de ceci n'est automatique : à cocher avant toute fusion `develop` → `main`.

- **Infrastructure appliquée** par le propriétaire selon la séquence de `infra/README.md` (« Premier déploiement ») : Worker, widget, import Resend, code, secrets, puis domaine `contact.paulperigault.dev`.
- **Clé de site** : la variable de dépôt `PUBLIC_TURNSTILE_SITEKEY` vaut aujourd'hui la **clé de test publique** de Cloudflare (`1x00000000000000000000AA`, toujours acceptée) pour que la CI construise et teste le formulaire. La remplacer par la vraie clé (`gh variable set`, sortie `contact_form_turnstile_sitekey`). Sinon, en production, chaque envoi serait refusé par le Worker.
- **Token de déploiement du Worker** : créer le secret GitHub `CLOUDFLARE_API_TOKEN_DEPLOY`, un token limité à _Workers Scripts : Edit_ sur le compte (#139).
- Compléter les `TODO (propriétaire)` de la page légale (`src/content/{fr,en}/legal.json`, section `contact`) et de `docs/compliance.md` : durée de conservation des messages et des journaux Resend, cadre des transferts hors UE (Cloudflare, Resend), mention éventuelle d'iCloud, exemption de consentement de Turnstile.
- Refaire la mesure de Turnstile avec la clé de production (`MEASURE_TURNSTILE=1`, `MEASURE_URL=https://paulperigault.fr/fr/`) et mettre à jour le tableau de `docs/compliance.md` si le résultat diffère de la clé de test.

## Infrastructure : suites possibles

- **DMARC pour `paulperigault.dev`** : aucun enregistrement `_dmarc` n'existe dans la zone (relevé du 2026-10-13), contrairement à ce qui était prévu. Le créer (par exemple `v=DMARC1; p=none; rua=…` pour commencer) améliore la délivrabilité des messages du formulaire. Modification DNS : décision du propriétaire, puis ajout au module `resend-domain`.
- **Secrets Store de Cloudflare (option C de l'ADR-0007)** : un secret « en écriture seule », géré par Terraform (`cloudflare_secrets_store_secret`) et lié au Worker par un binding `secrets_store_secret`, indépendant des versions du code. Cela rendrait les secrets déclaratifs sans les rejouer contre `wrangler deploy`. Nécessite les permissions _Secrets Store_ sur le token et une vérification de la façon dont la valeur est conservée dans le state.
- **`plan` Terraform en CI** avec un token Cloudflare en lecture seule dédié (issue à ouvrir) ; aujourd'hui seulement `fmt` et `validate`.

## Maintenance manuelle

- **gitleaks est épinglé à la main** (`security.yml`, variables `GITLEAKS_VERSION` et `GITLEAKS_SHA256`) : Dependabot ne voit pas un binaire téléchargé. À mettre à jour régulièrement (par exemple à chaque trimestre) : prendre la dernière release de `gitleaks/gitleaks`, recopier la somme SHA-256 de l'archive `linux_x64` depuis son fichier `checksums.txt`, vérifier que le job reste vert.

## Pipeline d'images Docker (suite de #24)

Le `Dockerfile` (image `nginx-unprivileged`, non-root) et `scripts/check-container.sh` (job CI `container`) existent. Reste :

- build et push de l'image vers un registre (GHCR) sur chaque release taguée ;
- scan de vulnérabilités (Trivy) dans la CI ;
- tags cohérents avec release-please (`:1.2.0`, `:latest`) et images de base épinglées par digest ;
- déploiement vers une cible cloud si le site quitte GitHub Pages.

## Contenu géré hors dépôt (suite de #25)

Le contenu (`src/content/{fr,en}`) est validé au build par des `Schema` Effect. Si un CMS headless devenait utile, il s'agirait d'un simple **autre `Layer` de `ContentRepository`** (même interface, mêmes schémas, même échec de build si le contenu est invalide) ; aucun composant à modifier. À déclencher seulement si le volume de contenu ou le nombre de contributeurs le justifie.

## Idées

- Vérifications d'accessibilité manuelles complémentaires (lecteur d'écran réel) en plus d'axe.
- Page « Notes techniques » alimentée par le même modèle de contenu, si le besoin d'écrire apparaît.
