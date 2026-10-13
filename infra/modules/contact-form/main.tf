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
