variable "zone_id" {
  description = "Zone du domaine d'envoi."
  type        = string
}

variable "domain" {
  description = "Domaine d'envoi vérifié chez Resend."
  type        = string
}

variable "dkim_public_key" {
  description = "Clé publique DKIM fournie par Resend (valeur `p=` de resend._domainkey), publique par nature."
  type        = string
}

variable "return_path_targets" {
  description = "Sous-domaines du chemin de retour Resend et leur cible CNAME."
  type        = map(string)
}

variable "dmarc_policy" {
  description = "Valeur de l'enregistrement DMARC (sans guillemets), par exemple « v=DMARC1; p=none; rua=mailto:… »."
  type        = string

  validation {
    condition     = startswith(var.dmarc_policy, "v=DMARC1;") && can(regex("; p=(none|quarantine|reject)(;|$)", var.dmarc_policy))
    error_message = "La politique DMARC doit commencer par « v=DMARC1; » et déclarer p=none, quarantine ou reject."
  }
}
