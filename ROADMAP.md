# Roadmap

Évolutions envisagées au-delà du travail courant. Cadrage uniquement : rien n'est implémenté tant qu'un point n'a pas été repris dans une issue.

## Chantier d'optimisation (octobre 2026)

Lots #172 à #180 et #161 (label `agent`), actions du propriétaire dans #181 (label `owner`), design system à cadrer après la migration (#182).

## Infrastructure et actions du propriétaire

- **Hébergement sur Cloudflare** (décidé le 2026-10-18) : code, en-têtes de sécurité (`frame-ancestors`, HSTS, COOP/CORP…) et runbook préparés sans rien appliquer (#179) ; les étapes réelles (DNS, `apply`) sont dans l'issue « Actions manuelles » (#181).
- **Actions GEO manuelles** : Search Console, Bing Webmaster, alignement des profils LinkedIn/GitHub, contrôles mensuels auprès des assistants (`docs/geo-checklist.md`).

## Formulaire de contact (épic #133) : état au 2026-10-13

Fait :

- **En production** depuis #163 (`main`), Worker redéployé par `deploy-worker.yml`, Pages publié.
- Infrastructure appliquée par la séquence de `infra/README.md` (widget, Worker, import Resend, DMARC, code, secrets, domaine) ; `plan` final : « No changes ».
- Vraie clé de site dans la variable de dépôt `PUBLIC_TURNSTILE_SITEKEY` ; secret `CLOUDFLARE_API_TOKEN_DEPLOY` créé.
- Worker vérifié en ligne (`https://contact.paulperigault.dev/`) : 405 sur GET, origine inconnue refusée, faux jeton Turnstile refusé par la vraie clé secrète.
- Page légale et registre finalisés (#158), sources dans `docs/compliance.md` ; fiches DPF de Cloudflare et Resend vérifiées par le propriétaire.
- Mesure de Turnstile avec la clé de production (#166) ; envoi réel de bout en bout réussi depuis `/fr/` (2026-10-13).
- Autorisation des rapports DMARC sur `paulperigault.fr` (TXT chez OVH).

Reste :

- **Portage des helpers PowerShell en Node** (#161) : lot 4 du chantier d'optimisation.

## Infrastructure : suites possibles

- **Durcir DMARC sur `paulperigault.dev`** : l'enregistrement `_dmarc` passe de l'observation (`p=none`, #156) à `v=DMARC1; p=quarantine; pct=100; rua=mailto:contact@paulperigault.fr` (#209, appliqué par le propriétaire), et `paulperigault.fr` autorise la réception des rapports (TXT chez OVH, fait). Lire les rapports agrégés reçus sur `contact@paulperigault.fr`. Après quelques semaines de rapports propres (tous les envois légitimes alignés SPF/DKIM via Resend, aucune source inconnue), passer à `p=quarantine` (fait par #209), puis, après une nouvelle période propre, à `p=reject`. Chaque étape = une modification de `dmarc_policy` dans `infra/main.tf`, un `plan` relu, un `apply`.
- **Durcir DMARC sur `paulperigault.fr`** : `_dmarc` est en observation (`v=DMARC1; p=none; rua=mailto:contact@paulperigault.fr`, module `zone-fr`, variable `dmarc_policy`), l'expéditeur étant iCloud (SPF `include:icloud.com`, DKIM `sig1._domainkey`). Lire les rapports agrégés ; après quelques semaines sans source inconnue ni échec d'alignement, passer à `p=quarantine`, puis `p=reject`. Chaque étape = une modification de `dmarc_policy`, un `plan` relu, un `apply`.
- **Secrets Store de Cloudflare (option C de l'ADR-0007)** : un secret « en écriture seule », géré par Terraform (`cloudflare_secrets_store_secret`) et lié au Worker par un binding `secrets_store_secret`, indépendant des versions du code. Cela rendrait les secrets déclaratifs sans les rejouer contre `wrangler deploy`. Nécessite les permissions _Secrets Store_ sur le token et une vérification de la façon dont la valeur est conservée dans le state.
- **`plan` OpenTofu en CI** : job `tofu-plan` livré (#203), sauté tant que le token Cloudflare et les clés R2 en lecture seule ne sont pas créés (#181).

## Maintenance manuelle

- **gitleaks est épinglé à la main** (`security.yml`, variables `GITLEAKS_VERSION` et `GITLEAKS_SHA256`) : Dependabot ne voit pas un binaire téléchargé. Le workflow hebdomadaire `gitleaks-watch.yml` (#204) ouvre une issue dès qu'une version plus récente sort, avec le bloc à recopier (version et SHA-256 de l'archive `linux_x64`) ; vérifier ensuite que le job `gitleaks` reste vert.

## Docker : supprimé (décision du 2026-10-18, fait au lot 9, #179)

La piste GHCR + Trivy de #24 est abandonnée : l'hébergement part sur Cloudflare Pages (ADR-0008). Les en-têtes de sécurité de `nginx.conf` ont été portés dans `public/_headers` et testés (`scripts/pages-headers.test.mjs`), puis le `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.dockerignore`, le script de contrôle du conteneur, le job CI `container` et l'entrée Dependabot Docker ont été supprimés.

## Contenu géré hors dépôt (suite de #25)

Le contenu (`src/content/{fr,en}`) est validé au build par des `Schema` Effect. Si un CMS headless devenait utile, il s'agirait d'un simple **autre `Layer` de `ContentRepository`** (même interface, mêmes schémas, même échec de build si le contenu est invalide) ; aucun composant à modifier. À déclencher seulement si le volume de contenu ou le nombre de contributeurs le justifie.

## Idées

- Vérifications d'accessibilité manuelles complémentaires (lecteur d'écran réel) en plus d'axe.
- Page « Notes techniques » alimentée par le même modèle de contenu, si le besoin d'écrire apparaît.
