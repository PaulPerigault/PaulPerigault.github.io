variable "project_id" {
  description = "Identifiant du projet GCP (6 à 30 caractères, unique dans le monde entier). Dédié à l'observabilité : rien d'autre n'y vit."
  type        = string
  default     = "paulperigault-observability"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Identifiant de projet GCP invalide (minuscules, chiffres, tirets ; 6 à 30 caractères)."
  }
}

variable "billing_account" {
  description = "Compte de facturation à lier au projet, ou null. Les API utilisées ici sont gratuites : à renseigner seulement si Google l'exige pour les activer."
  type        = string
  default     = null
}

variable "org_id" {
  description = "Organisation GCP parente, ou null pour un projet personnel sans organisation."
  type        = string
  default     = null
}

variable "github_repository" {
  description = "Dépôt autorisé à échanger son jeton OIDC (propriétaire/nom)."
  type        = string
  default     = "PaulPerigault/portfolio"
}

variable "github_repository_id" {
  description = "Identifiant numérique du dépôt : survit à un renommage, et empêche qu'un dépôt recréé sous le même nom hérite de l'accès."
  type        = string
  default     = "670824524"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "L'identifiant numérique du dépôt ne contient que des chiffres."
  }
}

variable "github_owner_id" {
  description = "Identifiant numérique du propriétaire du dépôt (même raison)."
  type        = string
  default     = "86080467"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_owner_id))
    error_message = "L'identifiant numérique du propriétaire ne contient que des chiffres."
  }
}

variable "workflow_file" {
  description = "Seul workflow autorisé à obtenir un jeton Google (fichier de .github/workflows/)."
  type        = string
  default     = "web-presence.yml"
}

variable "workflow_ref" {
  description = "Seule référence Git autorisée. Les exécutions planifiées tournent sur la branche par défaut (develop) : une branche de PR ne peut pas obtenir de jeton."
  type        = string
  default     = "refs/heads/develop"

  validation {
    condition     = startswith(var.workflow_ref, "refs/heads/")
    error_message = "Référence de branche attendue (refs/heads/<branche>)."
  }
}
