# Module `pages-site`

Hébergement du site statique sur Cloudflare Pages (ADR-0008). **Préparé, jamais appliqué par l'assistant ni par la CI** : le propriétaire applique après lecture du `plan`.

| Ressource                       | Rôle                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_pages_project.site` | projet Pages **sans source Git** : la CI enverra l'artefact `dist/` déjà construit et testé (envoi direct, même artefact)      |
| `cloudflare_pages_domain.site`  | un domaine personnalisé par entrée de `custom_domains` ; vide par défaut tant que le DNS n'est pas prêt                       |

Les en-têtes HTTP (HSTS, `frame-ancestors`, COOP/CORP, type du Markdown, cache) sont dans `public/_headers`, publié avec le site et testé par `scripts/pages-headers.test.mjs`. Le DNS du domaine canonique (`paulperigault.fr`, chez OVH) n'est pas géré ici : procédure dans `docs/runbook-cloudflare.md`.

## Entrées

`account_id`, `project_name` (par défaut `paulperigault`), `production_branch` (par défaut `main`), `custom_domains` (par défaut `[]`).

## Sorties

`project_name`, `pages_dev_url`, `custom_domains`.
