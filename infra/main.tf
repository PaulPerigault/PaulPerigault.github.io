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
