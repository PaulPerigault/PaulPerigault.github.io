# Lues par infra/identity (terraform_remote_state) pour poser les secrets GitHub du workflow
# web-presence. Aucune n'est affichée par les commandes npm : le nom de la clé contient « secret »
# (scripts/lib/tf-args.mjs refuse `output` sur ce motif).
output "workload_identity_provider" {
  description = "Nom complet du fournisseur de fédération (secret GitHub GOOGLE_WORKLOAD_IDENTITY_PROVIDER)."
  value       = google_iam_workload_identity_pool_provider.web_presence.name
}

output "service_account_email" {
  description = "E-mail du compte de service (secret GitHub GOOGLE_SERVICE_ACCOUNT) : à ajouter à Search Console, docs/manual-steps.md."
  value       = google_service_account.web_presence.email
}

output "crux_psi_api_key_secret" {
  description = "Clé d'API PageSpeed/CrUX (secret GitHub GOOGLE_API_KEY)."
  value       = google_apikeys_key.psi_crux.key_string
  sensitive   = true
}
