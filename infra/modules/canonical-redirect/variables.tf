variable "zone_id" {
  description = "Zone qui porte les hôtes à rediriger (proxifiés, sinon la règle ne s'applique pas)."
  type        = string
}

variable "hosts" {
  description = "Hôtes redirigés, par exemple [\"paulperigault.dev\", \"www.paulperigault.dev\"]."
  type        = list(string)

  validation {
    condition     = length(var.hosts) > 0 && alltrue([for host in var.hosts : can(regex("^[a-z0-9.-]+$", host))])
    error_message = "Au moins un hôte, en minuscules, sans schéma ni chemin."
  }
}

variable "target_origin" {
  description = "Origine canonique, sans barre finale (le chemin de la requête y est ajouté)."
  type        = string

  validation {
    condition     = can(regex("^https://[a-z0-9.-]+$", var.target_origin))
    error_message = "Origine attendue : https://<domaine>, sans chemin ni barre finale."
  }
}
