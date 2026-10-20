# Le dépôt design-system n'est planifié que si le jeton y a accès. La CI pose `false` tant que le
# jeton en lecture seule n'est pas étendu à ce dépôt (docs/infra.md, étape propriétaire) ; en local,
# la valeur par défaut `true` le gère. Jamais `false` pour un apply : `prevent_destroy` le refuserait.
variable "design_system" {
  description = "Gérer le dépôt PaulPerigault/design-system (false : plan CI sans accès au dépôt)."
  type        = bool
  default     = true
}
