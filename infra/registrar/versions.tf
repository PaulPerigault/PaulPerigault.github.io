# Brique « registrar » : délégation de paulperigault.fr chez OVH (serveurs de noms, DS).
# Authentifiée par un compte de service OAuth2 limité à ces deux objets (infra/identity/) :
# OVH_CLIENT_ID / OVH_CLIENT_SECRET, lus par le provider dans l'environnement.
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    ovh = {
      source  = "ovh/ovh"
      version = "~> 2.22.0"
    }
  }
}

provider "ovh" {
  endpoint = "ovh-eu"
}
