# Module `contact-form`

Infrastructure du formulaire de contact du site : le Worker de `worker/` et la vérification anti-robot.

| Ressource                                  | Rôle                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_turnstile_widget.contact`      | widget `managed`, région `world`, domaines `turnstile_domains` ; expose `sitekey` (publique) et `secret` (sensible)                                                 |
| `cloudflare_worker.contact`                | le Worker en tant que service, **sans code** : `workers.dev` et les prévisualisations désactivés, observabilité désactivée (aucune journalisation)                  |
| `cloudflare_workers_custom_domain.contact` | `hostname` → Worker ; Cloudflare crée lui-même l'enregistrement DNS et le certificat. Ne pas gérer cet enregistrement ailleurs.                                     |
| `cloudflare_ruleset.rate_limit`            | limitation de débit en bordure (phase `http_ratelimit` de la zone) : au-delà de `rate_limit_requests` requêtes en 10 s sur `rate_limit_path`, l'IP est bloquée 10 s |

**Limitation de débit, offre gratuite** (documentation Cloudflare relevée le 2026-10-19) : une seule règle par zone, champs _Path_ et _Verified Bot_ seulement (ni hôte ni méthode), compteur par IP (`ip.src`, avec `cf.colo.id` imposé), période et blocage de **10 s** uniquement. La règle de #181 (`http.host` + `http.request.method`, 5 par 10 minutes, blocage 10 minutes) était donc impossible. Retenu : `http.request.uri.path eq "/"` (chemin du Worker), 5 requêtes par 10 s. L'expression vaut pour toute la zone `paulperigault.dev`, mais l'apex et `www` sont redirigés avant cette phase. Un envoi coûte 1 ou 2 requêtes (POST, plus OPTIONS hors cache de prévalidation). C'est une barrière grossière : la limite par visiteur reste dans le Worker (#219).

Le code est déployé par `wrangler deploy` (`worker/wrangler.toml`, même `name`). Le fichier ne déclare ni route ni domaine, donc Wrangler ne touche pas au domaine géré ici.

## Entrées

`account_id`, `zone_id`, `hostname`, `worker_name` (par défaut `contact-form`), `turnstile_domains` (au moins un), `rate_limit_path` (par défaut `/`), `rate_limit_requests` (par défaut 5, entier ≥ 2).

## Sorties

`turnstile_sitekey`, `turnstile_secret` (sensible), `endpoint`, `worker_name`.

## Supprimer ce service

Retirer le bloc `module "contact_form"` de `infra/main.tf`, puis `plan` et `apply` par le propriétaire. Le site garde son repli `mailto:` : sans `PUBLIC_TURNSTILE_SITEKEY`, le formulaire n'est pas construit.
