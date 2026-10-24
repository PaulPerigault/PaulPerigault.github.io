variable "zone_id" {
  description = "Zone Cloudflare qui porte les enregistrements."
  type        = string
}

variable "domain" {
  description = "Apex de la zone (ex. `paulperigault.dev`)."
  type        = string
}

# Valeurs de https://developers.cloudflare.com/ssl/reference/certificate-authorities/ (relevé du
# 2026-10-24) : Let's Encrypt, Google Trust Services, SSL.com et Sectigo (secours). Cloudflare ajoute
# lui-même ces enregistrements dès qu'une zone en a un ; les déclarer évite qu'ils restent invisibles.
variable "authorities" {
  description = "Contenu des enregistrements CAA (domaine de l'autorité), pour `issue` et `issuewild`."
  type        = set(string)
  default = [
    "letsencrypt.org",
    "pki.goog; cansignhttpexchanges=yes",
    "ssl.com",
    "sectigo.com",
  ]

  validation {
    condition     = length(var.authorities) > 0 && alltrue([for ca in var.authorities : can(regex("^[a-z0-9.-]+[.][a-z]+(; .+)?$", ca))])
    error_message = "Au moins une autorité, sous la forme `domaine` ou `domaine; paramètre=valeur`."
  }
}
