# Roadmap

Évolutions envisagées au-delà du travail courant. Cadrage uniquement : rien n'est implémenté tant qu'un point n'a pas été repris dans une issue.

## En attente de décision du propriétaire

- **En-têtes de sécurité réels pour le site GitHub Pages** : mettre un proxy qui sait poser des en-têtes devant Pages (Cloudflare Transform Rules ou Worker) pour `frame-ancestors`, HSTS, COOP/CORP… Voir ADR-0004 et la section Sécurité de `CLAUDE.md`. Décision d'infrastructure (DNS, tiers).
- **Actions GEO manuelles** : Search Console, Bing Webmaster, alignement des profils LinkedIn/GitHub, contrôles mensuels auprès des assistants (`docs/geo-checklist.md`).

## Formulaire de contact (épic #133) : état au 2026-10-13

Fait :

- Infrastructure appliquée par la séquence de `infra/README.md` (widget, Worker, import Resend, DMARC, code, secrets, domaine) ; `plan` final : « No changes ».
- Vraie clé de site dans la variable de dépôt `PUBLIC_TURNSTILE_SITEKEY` ; secret `CLOUDFLARE_API_TOKEN_DEPLOY` créé.
- Worker vérifié en ligne (`https://contact.paulperigault.dev/`) : 405 sur GET, origine inconnue refusée, faux jeton Turnstile refusé par la vraie clé secrète.
- Page légale et registre finalisés (#158), sources dans `docs/compliance.md`.

Reste :

- **Après la mise en production** : refaire la mesure de Turnstile avec la clé de production (`MEASURE_TURNSTILE=1`, `MEASURE_URL=https://paulperigault.fr/fr/`), mettre à jour le tableau de `docs/compliance.md`, et faire un envoi réel de bout en bout.
- **À vérifier dans un navigateur** : présence active de Cloudflare (participant 5666) et de Resend / Plus Five Five (participant 8907) sur la liste officielle du Data Privacy Framework (pages rendues en JavaScript, non lisibles automatiquement).
- **Portage des helpers PowerShell en Node** (#161), priorité basse.

## Infrastructure : suites possibles

- **Durcir DMARC sur `paulperigault.dev`** : l'enregistrement `_dmarc` est créé par Terraform en mode observation (`v=DMARC1; p=none; rua=mailto:contact@paulperigault.fr`, module `resend-domain`, #156). **Prérequis pour recevoir les rapports** : l'adresse `rua` est sur un autre domaine (`.fr`) ; selon la RFC 7489 (§ 7.1), `paulperigault.fr` doit l'autoriser par un TXT `paulperigault.dev._report._dmarc.paulperigault.fr` = `v=DMARC1`, à créer **chez OVH** par le propriétaire (hors Terraform), sans quoi la plupart des expéditeurs n'enverront pas de rapport. Lire ensuite les rapports agrégés reçus sur `contact@paulperigault.fr`. Après quelques semaines de rapports propres (tous les envois légitimes alignés SPF/DKIM via Resend, aucune source inconnue), passer à `p=quarantine`, puis, après une nouvelle période propre, à `p=reject`. Chaque étape = une modification de `dmarc_policy` dans `infra/main.tf`, un `plan` relu, un `apply` par le propriétaire.
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
