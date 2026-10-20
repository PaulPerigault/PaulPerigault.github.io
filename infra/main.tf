# Racine : compose un module par service. Ajouter un service = ajouter un module, sans toucher aux autres.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "cloudflare_zone" "services" {
  filter = {
    name = var.zone_name
  }
}

module "contact_form" {
  source = "./modules/contact-form"

  account_id = var.account_id
  zone_id    = data.cloudflare_zone.services.zone_id
  hostname   = "contact.${var.zone_name}"
  # `www` et `.dev` redirigent vers l'apex : aucune page n'y affiche le formulaire.
  turnstile_domains = ["paulperigault.fr"]
}

module "resend_domain" {
  source = "./modules/resend-domain"

  zone_id         = data.cloudflare_zone.services.zone_id
  domain          = var.zone_name
  dkim_public_key = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMOqYxCjpS8Ak1bCzMbG6sWL0L7hz35oX6g7aHcptnThF3DO8I32G4MkX59+pyrGlLlpYwMz/8aHeXUfHUtTbrsojiRQFV9Isl7YathNKJysHFBicX+3bD1rTx+5OPNqmx4eHjaIHUGCnN2hGUZBnBXOXUAyRHvN1j91WPVDPmUQIDAQAB"
  # Observation (p=none) puis durcissement progressif : voir ROADMAP.md.
  dmarc_policy = "v=DMARC1; p=none; rua=mailto:contact@paulperigault.fr"
  return_path_targets = {
    send  = "send.forge.rmta.net"
    rsend = "rsend-euw1.forge.rmta.net"
  }
}

locals {
  canonical_origin = "https://${var.canonical_domain}"
  on_pages         = var.fr_site_host == "cloudflare-pages"
}

# Hébergement du site (ADR-0008) : projet Pages ; ses domaines ne sont servis qu'une fois la zone
# `.fr` active chez Cloudflare (runbook §5, `fr_site_host`).
module "pages_site" {
  source = "./modules/pages-site"

  account_id     = var.account_id
  custom_domains = local.on_pages ? [var.canonical_domain, "www.${var.canonical_domain}"] : []
}

# Zone du domaine canonique chez Cloudflare (OVH reste le registrar, runbook §4).
module "zone_fr" {
  source = "./modules/zone-fr"

  account_id     = var.account_id
  domain         = var.canonical_domain
  dnssec_enabled = var.fr_dnssec
  pages_target   = local.on_pages ? module.pages_site.subdomain : null
}

# `.dev` et `www.dev` → `.fr` (docs/infra.md §2) ; ruleset créé à la main, importé (imports.tf).
module "dev_redirect" {
  source = "./modules/canonical-redirect"

  zone_id       = data.cloudflare_zone.services.zone_id
  hosts         = [var.zone_name, "www.${var.zone_name}"]
  target_origin = local.canonical_origin
}

# `www.fr` → apex, que GitHub Pages faisait seul ; sans effet tant que `www` est en DNS seul.
module "fr_www_redirect" {
  source = "./modules/canonical-redirect"

  zone_id       = module.zone_fr.zone_id
  hosts         = ["www.${var.canonical_domain}"]
  target_origin = local.canonical_origin
}
