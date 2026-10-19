# Module `zone-fr`

Zone DNS du domaine canonique `paulperigault.fr` chez Cloudflare (ADR-0008). **OVH reste le registrar** : les trois seules actions faites à la main, chez OVH, sont couper DNSSEC, remplacer les serveurs de noms par ceux de la sortie `name_servers`, puis publier le DS de la sortie `dnssec_ds` (`docs/runbook-cloudflare.md` §4). Tant que les serveurs de noms ne pointent pas vers Cloudflare, la zone reste `pending` et ne répond à personne : l'appliquer ne change rien pour les visiteurs.

| Ressource                            | Rôle                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_zone.fr`                 | zone complète (`full`), offre gratuite                                                                                                                         |
| `cloudflare_dns_record.mx`           | `MX` iCloud `mx01` et `mx02`, priorité 10                                                                                                                      |
| `cloudflare_dns_record.txt`          | SPF iCloud, `apple-domain`, Google Search Console (jeton **une seule fois** : la valeur OVH le contenait deux fois), autorisation des rapports DMARC du `.dev` |
| `cloudflare_dns_record.dkim`         | `CNAME` `sig1._domainkey` (DKIM iCloud)                                                                                                                        |
| `cloudflare_dns_record.github_pages` | tant que `pages_target` est nul : quatre `A` apex vers GitHub Pages et `CNAME` `www` vers `paulperigault.github.io`                                            |
| `cloudflare_dns_record.pages`        | quand `pages_target` est donné : `CNAME` `@` et `www` vers le projet Pages, **proxifiés**                                                                      |
| `cloudflare_zone_setting.off`        | _Email Address Obfuscation_ et _Rocket Loader_ désactivés (ils casseraient le `mailto:` et la CSP, `docs/infra.md` §3)                                         |
| `cloudflare_bot_management.fr`       | robots d'IA **non bloqués**, pas de labyrinthe, `robots.txt` non réécrit (le site doit être connu des assistants IA, `docs/seo.md`)                            |
| `cloudflare_zone_dnssec.fr`          | DNSSEC `disabled` par défaut, `active` avec `dnssec_enabled = true`                                                                                            |

Tout est en **DNS seul** sauf les deux `CNAME` du site sur Pages : la messagerie et les vérifications de propriété ne passent jamais par le proxy.

**Bascule GitHub Pages → Cloudflare Pages** : un `CNAME` ne peut pas coexister avec un `A` du même nom. `cloudflare_dns_record.pages` déclare `depends_on` sur les enregistrements GitHub : OpenTofu les détruit avant de créer les `CNAME` (arête vérifiée avec `tofu graph -plan`, sans elle aucun ordre n'est garanti). Un seul `apply`, quelques secondes sans enregistrement d'apex.

**DNSSEC** : à n'activer qu'après le changement de serveurs de noms et l'expiration de l'ancien DS d'OVH (runbook §4.5). Cloudflare garde le statut `pending` jusqu'à ce qu'il voie le DS au registre : entre l'`apply` et la publication du DS chez OVH, un `plan` peut montrer `status` à remettre à `active` ; c'est attendu et disparaît après §4.6.

## Entrées

`account_id`, `domain` (par défaut `paulperigault.fr`), `dnssec_enabled` (par défaut `false`), `pages_target` (par défaut `null` : GitHub Pages), `mx_hosts`, `apple_domain_token`, `google_site_verification` (jeton seul, validé), `github_pages_ipv4`, `github_pages_host`. Toutes les valeurs sont publiques (publiées en DNS).

## Sorties

`zone_id`, `name_servers` (à saisir chez OVH), `dnssec_ds` (`key_tag`, `flags`, `algorithm`, `public_key`, `digest_type`, `digest`, `ds` ; `null` tant que DNSSEC est désactivé).

## Supprimer ce service

Jamais tant que les serveurs de noms d'OVH pointent vers Cloudflare : d'abord retirer le DS chez OVH, attendre son TTL, remettre les serveurs d'OVH (runbook §4.7), puis seulement retirer le module.
