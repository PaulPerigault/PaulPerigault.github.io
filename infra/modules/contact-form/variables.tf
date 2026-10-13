variable "account_id" {
  description = "Compte Cloudflare."
  type        = string
}

variable "zone_id" {
  description = "Zone qui porte le domaine personnalisé du Worker."
  type        = string
}

variable "hostname" {
  description = "Domaine personnalisé du Worker (Cloudflare crée l'enregistrement DNS et le certificat)."
  type        = string
}

variable "worker_name" {
  description = "Nom du Worker ; doit égaler `name` dans worker/wrangler.toml."
  type        = string
  default     = "contact-form"
}

variable "turnstile_domains" {
  description = "Domaines autorisés à afficher le widget Turnstile."
  type        = list(string)

  validation {
    condition     = length(var.turnstile_domains) > 0
    error_message = "Au moins un domaine est requis pour le widget Turnstile."
  }
}
