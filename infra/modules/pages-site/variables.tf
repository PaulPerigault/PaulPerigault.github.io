variable "account_id" {
  description = "Compte Cloudflare."
  type        = string
}

variable "project_name" {
  description = "Nom du projet Pages (sous-domaine `<nom>.pages.dev`)."
  type        = string
  default     = "paulperigault"
}

variable "production_branch" {
  description = "Branche de production : les déploiements de cette branche servent les domaines personnalisés."
  type        = string
  default     = "main"
}

variable "custom_domains" {
  description = "Domaines personnalisés servis par le projet. Vide tant que le DNS n'est pas prêt (action manuelle)."
  type        = list(string)
  default     = []
}
