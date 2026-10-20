variable "domain" {
  description = "Domaine enregistré chez OVH."
  type        = string
}

variable "name_servers" {
  description = "Serveurs de noms délégués. Ceux d'OVH, puis la sortie fr_name_servers de infra/ (runbook §4.4)."
  type        = list(string)

  validation {
    condition     = length(var.name_servers) >= 2 && alltrue([for host in var.name_servers : can(regex("^[a-z0-9.-]+[.][a-z]+$", host))])
    error_message = "Au moins deux serveurs de noms, noms d'hôte en minuscules sans point final."
  }
}

variable "ds_records" {
  description = "Clé de signature de la zone Cloudflare (sortie fr_dnssec_ds de infra/ : key_tag, public_key). Vide : aucun DS."
  type = list(object({
    key_tag    = number
    public_key = string
  }))
  default = []

  validation {
    condition     = length(var.ds_records) <= 1
    error_message = "Une seule clé : celle de Cloudflare."
  }
}
