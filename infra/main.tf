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

# Hébergement du site (ADR-0008) : projet Pages préparé, domaines ajoutés après la bascule DNS.
module "pages_site" {
  source = "./modules/pages-site"

  account_id = var.account_id
}
