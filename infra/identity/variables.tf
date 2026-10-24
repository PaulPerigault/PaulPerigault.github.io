variable "bootstrap_cloudflare_token" {
  description = "Jeton d'amorçage Cloudflare (API Tokens : Edit), BOOTSTRAP_CLOUDFLARE, chargé par npm run infra:identity."
  type        = string
  sensitive   = true
}

variable "bootstrap_ovh_application_key" {
  description = "Clé d'application OVH d'amorçage (BOOTSTRAP_OVH_KEY)."
  type        = string
  sensitive   = true
}

variable "bootstrap_ovh_application_secret" {
  description = "Secret d'application OVH d'amorçage (BOOTSTRAP_OVH_SECRET)."
  type        = string
  sensitive   = true
}

variable "bootstrap_ovh_consumer_key" {
  description = "Clé consommateur OVH d'amorçage (BOOTSTRAP_OVH_CONSUMER)."
  type        = string
  sensitive   = true
}

variable "owner_ip" {
  description = "Adresse IP publique du propriétaire, relevée par npm run infra:identity ; seule autorisée à écrire chez OVH. Jamais dans le dépôt."
  type        = string

  validation {
    condition     = can(cidrhost("${var.owner_ip}/32", 0)) || can(cidrhost("${var.owner_ip}/128", 0))
    error_message = "Adresse IPv4 ou IPv6 attendue, sans masque."
  }
}

variable "account_id" {
  description = "Compte Cloudflare du portfolio."
  type        = string
  default     = "5d7f707043c8dbe25d945c965f24880e"
}

variable "domain" {
  description = "Domaine enregistré chez OVH, seule ressource des politiques IAM."
  type        = string
  default     = "paulperigault.fr"
}

variable "token_expires_on" {
  description = "Expiration des jetons Cloudflare créés ici (rotation : nouvel apply de la brique)."
  type        = string
  default     = "2027-10-19T00:00:00Z"
}

variable "google_observability" {
  description = "Pose les secrets GitHub du workflow web-presence depuis le state de infra/google-observability : true seulement après l'apply de cette brique (docs/manual-steps.md)."
  type        = bool
  default     = false
}
