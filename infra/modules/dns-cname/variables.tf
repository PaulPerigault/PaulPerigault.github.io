variable "zone_id" {
  description = "Zone Cloudflare qui porte l'enregistrement."
  type        = string
}

variable "name" {
  description = "Nom complet de l'enregistrement (ex. `ds.paulperigault.dev`)."
  type        = string
}

variable "target" {
  description = "Cible du CNAME : sous-domaine `<projet>.pages.dev` d'un projet Pages."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+[.]pages[.]dev$", var.target))
    error_message = "La cible doit être un sous-domaine *.pages.dev."
  }
}
