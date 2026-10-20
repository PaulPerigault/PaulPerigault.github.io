variable "cloudflare_api_token" {
  description = "Token API Cloudflare « terraform-portfolio » (TF_VAR_cloudflare_api_token, chargé par npm run infra:tf)."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Identifiant du compte Cloudflare (pas un secret)."
  type        = string
  default     = "5d7f707043c8dbe25d945c965f24880e"
}

variable "zone_name" {
  description = "Zone Cloudflare qui porte les services ; redirigée vers le domaine canonique."
  type        = string
  default     = "paulperigault.dev"
}

variable "canonical_domain" {
  description = "Domaine canonique du site (zone `zone-fr`, registrar OVH)."
  type        = string
  default     = "paulperigault.fr"
}

# Bascule pilotée par deux variables, changées par PR à chaque étape du runbook (§4.5 puis §5).
variable "fr_dnssec" {
  description = "DNSSEC de la zone `.fr` chez Cloudflare : true seulement après le changement de serveurs de noms (runbook §4.5)."
  type        = bool
  default     = true
}

variable "fr_site_host" {
  description = "Hébergeur servi par `paulperigault.fr` : github-pages (DNS seul) ou cloudflare-pages (CNAME proxifiés, runbook §5)."
  type        = string
  default     = "github-pages"

  validation {
    condition     = contains(["github-pages", "cloudflare-pages"], var.fr_site_host)
    error_message = "Valeurs admises : github-pages, cloudflare-pages."
  }
}
