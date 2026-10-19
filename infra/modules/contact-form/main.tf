# Service « formulaire de contact » : widget Turnstile, Worker (sans code : le code est déployé
# par Wrangler) et son domaine personnalisé. La gestion des secrets du Worker dépend de la
# répartition Terraform / Wrangler retenue (issue #138, ADR-0007).

resource "cloudflare_turnstile_widget" "contact" {
  account_id = var.account_id
  name       = "Formulaire de contact"
  domains    = var.turnstile_domains
  # `managed` : Cloudflare ne demande une action au visiteur que si le signal est douteux.
  mode   = "managed"
  region = "world"
}

resource "cloudflare_worker" "contact" {
  account_id = var.account_id
  name       = var.worker_name

  # Joignable seulement par son domaine personnalisé.
  subdomain = {
    enabled          = false
    previews_enabled = false
  }

  # Aucune journalisation : le Worker traite des données personnelles.
  observability = {
    enabled = false
  }
}

resource "cloudflare_workers_custom_domain" "contact" {
  account_id = var.account_id
  zone_id    = var.zone_id
  hostname   = var.hostname
  service    = cloudflare_worker.contact.name
}

# Limitation de débit en bordure, avant le Worker (#178, constat W8 : Turnstile est sinon la seule
# barrière). Offre gratuite (doc Cloudflare, relevé du 2026-10-19) : 1 règle, champs Path et Verified
# Bot seulement (ni hôte ni méthode), compteur par IP, période et blocage de 10 s. L'expression porte
# donc sur le chemin du Worker et vaut pour toute la zone : l'apex et `www` sont redirigés par la
# phase précédente (http_request_dynamic_redirect) et n'arrivent jamais ici. Un envoi du formulaire
# coûte 1 ou 2 requêtes (POST, plus OPTIONS quand la prévalidation CORS n'est pas en cache). La
# limite fine reste dans le Worker (#219).
resource "cloudflare_ruleset" "rate_limit" {
  zone_id     = var.zone_id
  name        = "default"
  description = "Limitation de débit du formulaire de contact (OpenTofu)"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [{
    ref         = "contact"
    description = "Formulaire de contact : ${var.rate_limit_requests} requêtes par 10 s et par IP"
    expression  = "(http.request.uri.path eq \"${var.rate_limit_path}\")"
    action      = "block"
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = var.rate_limit_requests
      mitigation_timeout  = 10
    }
  }]
}
