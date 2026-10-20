# Brique « identité » : crée les jetons limités dont se servent infra/ et infra/registrar/.
# Seule brique authentifiée avec les jetons d'amorçage (BOOTSTRAP_*, larges et de courte durée).
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.27.0"
    }
    ovh = {
      source  = "ovh/ovh"
      version = "~> 2.22.0"
    }
  }
}
