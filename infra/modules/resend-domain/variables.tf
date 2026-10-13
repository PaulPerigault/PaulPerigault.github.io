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
