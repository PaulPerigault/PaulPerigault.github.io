# Module `dns-caa`

Enregistrements `CAA` de l'apex d'une zone Cloudflare : seules les autorités de certification listées peuvent émettre pour le domaine (`issue`) ou en générique (`issuewild`). Utilisé pour `paulperigault.dev` (racine) et `paulperigault.fr` (`zone-fr`).

Autorités par défaut, celles que Cloudflare peut utiliser pour ses certificats (relevé du 2026-10-24, [documentation Cloudflare](https://developers.cloudflare.com/ssl/reference/certificate-authorities/)) : `letsencrypt.org`, `pki.goog; cansignhttpexchanges=yes`, `ssl.com`, `sectigo.com` (secours). Let's Encrypt couvre aussi GitHub Pages, qui sert encore le `.fr` avant la bascule. Une autorité absente de la liste est refusée : toute nouvelle autorité utilisée par Cloudflare doit être ajoutée ici avant qu'elle n'émette.

| Ressource                   | Rôle                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `cloudflare_dns_record.caa` | un `CAA` par couple (`issue` ou `issuewild`) × autorité, DNS seul |

## Entrées

`zone_id`, `domain` (apex), `authorities` (par défaut les quatre ci-dessus ; validé, au moins une).

## Sorties

`records` (clés `<tag>-<autorité>`).

Testé par `infra/tests/dns_caa.tftest.hcl` (provider simulé).
