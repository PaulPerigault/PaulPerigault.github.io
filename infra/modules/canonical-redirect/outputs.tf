output "ruleset_id" {
  description = "Identifiant du ruleset de redirection de la zone."
  value       = cloudflare_ruleset.redirect.id
}
