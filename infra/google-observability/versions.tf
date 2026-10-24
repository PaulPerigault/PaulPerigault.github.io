# Brique « google-observability » : accès en lecture seule de la CI aux API Google (Search Console,
# PageSpeed Insights, CrUX) pour le workflow web-presence. Aucune clé de compte de service : la CI
# s'authentifie par fédération d'identité (Workload Identity Federation) avec son jeton OIDC.
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.8.0"
    }
  }
}
