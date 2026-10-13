variable "cloudflare_api_token" {
  description = "Token API Cloudflare « terraform-portfolio » (TF_VAR_cloudflare_api_token, chargé par tf.ps1)."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Identifiant du compte Cloudflare (pas un secret)."
  type        = string
  default     = "5d7f707043c8dbe25d945c965f24880e"
}

variable "zone_name" {
  description = "Zone Cloudflare qui porte les services (le domaine canonique du site reste chez OVH)."
  type        = string
  default     = "paulperigault.dev"
}
