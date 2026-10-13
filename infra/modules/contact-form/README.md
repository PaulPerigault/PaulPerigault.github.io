# Module `contact-form`

Infrastructure du formulaire de contact du site : le Worker de `worker/` et la vérification anti-robot.

| Ressource                                  | Rôle                                                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_turnstile_widget.contact`      | widget `managed`, région `world`, domaines `turnstile_domains` ; expose `sitekey` (publique) et `secret` (sensible)                                |
| `cloudflare_worker.contact`                | le Worker en tant que service, **sans code** : `workers.dev` et les prévisualisations désactivés, observabilité désactivée (aucune journalisation) |
| `cloudflare_workers_custom_domain.contact` | `hostname` → Worker ; Cloudflare crée lui-même l'enregistrement DNS et le certificat. Ne pas gérer cet enregistrement ailleurs.                    |

Le code est déployé par `wrangler deploy` (`worker/wrangler.toml`, même `name`). Le fichier ne déclare ni route ni domaine, donc Wrangler ne touche pas au domaine géré ici.

## Entrées

`account_id`, `zone_id`, `hostname`, `worker_name` (par défaut `contact-form`), `turnstile_domains` (au moins un).

## Sorties

`turnstile_sitekey`, `turnstile_secret` (sensible), `endpoint`, `worker_name`.

## Supprimer ce service

Retirer le bloc `module "contact_form"` de `infra/main.tf`, puis `plan` et `apply` par le propriétaire. Le site garde son repli `mailto:` : sans `PUBLIC_TURNSTILE_SITEKEY`, le formulaire n'est pas construit.
