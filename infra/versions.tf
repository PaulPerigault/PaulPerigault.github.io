# Versions épinglées : Terraform 1.15.x et provider Cloudflare 5.27.x (le lock fichier fixe les empreintes).
# La v5 du provider a renommé beaucoup de ressources : se référer à la doc de la version épinglée.
terraform {
  required_version = "~> 1.15.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.27.0"
    }
  }
}
