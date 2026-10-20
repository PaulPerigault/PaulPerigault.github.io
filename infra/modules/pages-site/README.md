# Module `pages-site`

Hébergement du site statique sur Cloudflare Pages (ADR-0008). **Préparé, jamais appliqué par l'assistant ni par la CI** : le propriétaire applique après lecture du `plan`.

| Ressource                       | Rôle                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_pages_project.site` | projet Pages **sans source Git** : la CI enverra l'artefact `dist/` déjà construit et testé (envoi direct, même artefact) |
| `cloudflare_pages_domain.site`  | un domaine personnalisé par entrée de `custom_domains` ; la racine les donne quand `fr_site_host = "cloudflare-pages"`    |

Les en-têtes HTTP (HSTS, `frame-ancestors`, COOP/CORP, type du Markdown, cache) sont dans `public/_headers`, publié avec le site et testé par `scripts/pages-headers.test.mjs`. Les `CNAME` qui activent ces domaines sont dans le module `zone-fr` (même variable de bascule) : procédure dans `docs/runbook-cloudflare.md` §5.

## Entrées

`account_id`, `project_name` (par défaut `paulperigault`), `production_branch` (par défaut `main`), `custom_domains` (par défaut `[]`).

## Sorties

`project_name`, `subdomain` (cible des `CNAME`), `pages_dev_url`, `custom_domains`.
