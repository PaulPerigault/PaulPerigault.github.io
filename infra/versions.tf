# Versions épinglées : OpenTofu 1.13.x et provider Cloudflare 5.27.x (le lock fichier fixe les empreintes).
# Bloc `terraform` : c'est aussi le nom du bloc de configuration pour OpenTofu.
# La v5 du provider a renommé beaucoup de ressources : se référer à la doc de la version épinglée.
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.27.0"
    }
  }
}
