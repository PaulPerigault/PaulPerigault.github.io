variable "account_id" {
  description = "Compte Cloudflare qui crée la zone."
  type        = string
}

variable "domain" {
  description = "Domaine canonique (zone créée chez Cloudflare, registrar inchangé)."
  type        = string
  default     = "paulperigault.fr"
}

variable "dnssec_enabled" {
  description = "Signe la zone. N'activer qu'après le changement de serveurs de noms (runbook §4.5)."
  type        = bool
  default     = false
}

variable "pages_target" {
  description = "Sous-domaine `*.pages.dev` du projet. Nul : le site reste sur GitHub Pages (DNS seul)."
  type        = string
  default     = null

  validation {
    condition     = var.pages_target == null || can(regex("^[a-z0-9-]+[.]pages[.]dev$", var.pages_target))
    error_message = "Cible attendue : <projet>.pages.dev, ou null."
  }
}

variable "mx_hosts" {
  description = "Serveurs de messagerie iCloud (priorité 10)."
  type        = list(string)
  default     = ["mx01.mail.icloud.com", "mx02.mail.icloud.com"]
}

variable "apple_domain_token" {
  description = "Jeton de vérification du domaine chez Apple (public : publié en DNS)."
  type        = string
  default     = "2bd6D1utf4PWjrR4"
}

variable "google_site_verification" {
  description = "Jeton Google Search Console, une seule fois (la valeur OVH le contenait deux fois)."
  type        = string
  default     = "cxQAcHWF8Rlb3k7ylL2GCZe3wRkX-3cEqoYpLXtfk5c"

  validation {
    condition     = !strcontains(var.google_site_verification, "google-site-verification")
    error_message = "Le jeton seul, sans préfixe ni répétition."
  }
}

variable "dmarc_policy" {
  description = "Valeur de l'enregistrement DMARC du domaine (sans guillemets). Observation (p=none) avec rapports agrégés à une adresse du même domaine, donc sans autorisation externe."
  type        = string
  default     = "v=DMARC1; p=none; rua=mailto:contact@paulperigault.fr"

  validation {
    condition     = startswith(var.dmarc_policy, "v=DMARC1;") && can(regex("; p=(none|quarantine|reject)(;|$)", var.dmarc_policy))
    error_message = "La politique DMARC doit commencer par « v=DMARC1; » et déclarer p=none, quarantine ou reject."
  }
}

variable "github_pages_ipv4" {
  description = "Adresses de GitHub Pages pour l'apex, tant que le site y est servi."
  type        = list(string)
  default     = ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"]
}

variable "github_pages_host" {
  description = "Cible du CNAME `www` tant que le site est sur GitHub Pages."
  type        = string
  default     = "paulperigault.github.io"
}
