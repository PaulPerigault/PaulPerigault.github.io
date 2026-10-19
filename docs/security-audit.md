# Audit de sécurité (lot 8, #178)

Audit du 2026-10-19, de bout en bout : Worker du formulaire, CSP et en-têtes, garde-fous de secrets et de l'assistant, workflows, dépendances. Méthode : deux audits en lecture seule par des sous-agents distincts (Worker ; site, garde-fous et chaîne d'approvisionnement), puis **chaque constat contre-vérifié par un troisième sous-agent qui ne l'a pas produit**, avec sondes exécutées. Un constat confirmé dans le code donne d'abord un test qui échoue, puis le correctif.

## Constats

| Id | Sujet | Sévérité annoncée | Contre-vérification | Suite |
| --- | --- | --- | --- | --- |
| W1 | `siteverify` en erreur HTTP → `challenge` (403) au lieu de `unavailable` (502), contraire au contrat du README | faible | confirmé | corrigé (`worker/src/turnstile.ts`) + test |
| W2 | `hostname`/`action` de `siteverify` non vérifiés | faible | **écarté** : le widget n'autorise que `paulperigault.fr`, domaine du propriétaire | — |
| W3 | appels sortants (Turnstile, Resend) sans délai maximal | faible | confirmé, négligeable | corrigé : `UPSTREAM_TIMEOUT_MS` (5 s) + test |
| W4 | caractères de contrôle acceptés dans l'adresse | faible | confirmé, négligeable | corrigé + test |
| W5 | nom (repris dans le sujet) avec caractères invisibles (U+202E, largeur nulle, U+2028/2029) | faible | confirmé, négligeable | corrigé + test |
| W6 | flux du corps interrompu → exception, 500 générique sans JSON ni CORS | faible | confirmé, négligeable | corrigé (400 `invalid`) + test |
| W7 | pas de `Vary: Origin` sur la réponse 403 `forbidden` | info | — | non traité : `Cache-Control: no-store` |
| W8 | pas de limitation de débit (l'origine n'authentifie pas) | info | — | action manuelle (#181) : règle de limitation Cloudflare |
| W9 | erreurs 4xx et 5xx de Resend toutes en 502 | info | — | voulu : aucun détail amont renvoyé |
| S1 | garde-fou des secrets : jokers finaux (`.env*`, `.dev.vars?`), sauvegardes (`~`) et casse non repérés | moyenne | confirmé (jokers et casse = accidents réalistes) ; guillemets coupés et accolades = adversaire, hors périmètre | corrigé (`scripts/lib/secret-files.mjs`) + tests ; la 1re version de la regex (quantificateurs imbriqués) a été signalée par CodeQL (ReDoS) et remplacée, avec un test de temps linéaire |
| S2 | balise CSP après le script en ligne, le JSON-LD et les balises SEO | faible | confirmé, négligeable : placement imposé par Astro, aucun contenu injectable avant la balise | consigné, puis traité par #200 : la position est imposée par Astro (non modifiable avec `security.csp`), donc `e2e/csp-position.spec.ts` garantit que rien d'externe ni d'actif ne précède la balise et que chaque script inline qui la précède est déjà autorisé par son hash |
| S3 | `homepage` d'un dépôt GitHub rendue en `href` sans contrôle du schéma | faible | confirmé, négligeable (dépôts du propriétaire, CSP) | corrigé : https seulement, sinon aucun lien ; `html_url` sur `https://github.com/` + tests |
| S4 | `release.yml` donne `contents`/`pull-requests: write` au `GITHUB_TOKEN` inutilisé | faible | confirmé (l'action n'utilise que son entrée `token`) | corrigé : `permissions: {}` + test |
| S5 | auto-merge Dependabot des mineures de toute dépendance npm | faible | risque accepté : délai de 7 jours, check `ci` requis, majeures et Terraform exclus | consigné |
| S6 | en-têtes absents sur GitHub Pages (HSTS, `frame-ancestors`, COOP/CORP) ; HSTS `includeSubDomains` de `nginx.conf` à ne pas reprendre tel quel | info | — | lot 9 (#179) |
| S7 | `infra:tf` transmet tout argument : `console`, `show`, `output` du secret afficheraient le secret Turnstile | info | confirmé pour `console` (la règle `deny` d'`output -raw …secret` existait déjà) | corrigé : refus dans `scripts/lib/tf-args.mjs` (pour tout appelant) + règles `deny` `console` + tests |
| S8 | `npm audit --audit-level=high` ignore les avis modérés | info | confirmé, négligeable : dépendances de build seulement, Dependabot couvre les avis modérés | corrigé par #200 : `npm audit --audit-level=moderate` pour le site **et** le Worker (matrice du job `audit`, sans installation) + test |

## Mesures

| Mesure | Avant | Après |
| --- | --- | --- |
| Constats confirmés dans le code | 11 (1 moyen, 10 faibles ou info) | 0 non traité (9 corrigés avec test au lot 8 ; S2 et S8 traités par #200) |
| Constats écartés à la contre-vérification | — | 2 (W2 ; S7 sur `output -raw`, déjà couvert) |
| `npm audit` du site (complet et `--omit=dev`) | 0 | 0 |
| `npm audit` du Worker (complet et `--omit=dev`) | 0 | 0 |
| Tests du Worker | 39 | 49 |

## Vérifié sans constat

CORS exact (`null`, barre finale, `www.` et origine absente refusés ; `*` ignoré) ; lecture du corps bornée en flux avant `JSON.parse` ; regex d'adresse sans ReDoS (≤ 254 caractères) ; un seul destinataire fixe, `from` fixe, JSON vers Resend (pas d'injection d'en-tête) ; jetons Turnstile à usage unique (rejeu refusé par Cloudflare) ; CSP sans `unsafe-inline`, exception du formulaire limitée à `/fr/` et `/en/` ; JSON-LD échappé ; scripts en ligne sur liste blanche (`light|dark`, `fr|en`) ; aucun `pull_request_target` ni `workflow_run` ; actions épinglées par SHA ; seul `.well-known/security.txt` comme fichier caché publié ; secrets d'infrastructure uniquement dans l'environnement ou le stdin des processus enfants, jamais en argument.
