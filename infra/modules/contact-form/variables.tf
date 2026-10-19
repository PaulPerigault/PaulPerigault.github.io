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

variable "rate_limit_path" {
  description = "Chemin du Worker compté par la limitation de débit (offre gratuite : filtre sur le chemin seulement)."
  type        = string
  default     = "/"
}

variable "rate_limit_requests" {
  description = "Requêtes admises par IP en 10 s avant un blocage de 10 s (un envoi = POST, plus OPTIONS hors cache)."
  type        = number
  default     = 5

  validation {
    condition     = var.rate_limit_requests >= 2 && floor(var.rate_limit_requests) == var.rate_limit_requests
    error_message = "Entier d'au moins 2 : un envoi légitime peut faire deux requêtes."
  }
}
