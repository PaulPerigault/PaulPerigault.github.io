# Module `dns-cname`

Un enregistrement `CNAME` **proxifié** (TTL automatique) d'une zone Cloudflare vers le sous-domaine
`<projet>.pages.dev` d'un projet Pages : il active le domaine personnalisé déclaré par le module
`pages-site`. Utilisé pour `ds.paulperigault.dev`, la documentation du design system (#268).

| Ressource                     | Rôle                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `cloudflare_dns_record.cname` | `CNAME` proxifié vers `*.pages.dev`, commenté « OpenTofu » |

## Entrées

`zone_id`, `name` (nom complet), `target` (validé : `*.pages.dev`).

## Sorties

`hostname`.
