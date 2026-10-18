output "contact_form_turnstile_sitekey" {
  description = "Clé de site Turnstile (publique) : valeur de la variable de dépôt PUBLIC_TURNSTILE_SITEKEY."
  value       = module.contact_form.turnstile_sitekey
}

output "contact_form_turnstile_secret" {
  description = "Secret Turnstile du Worker. Lu uniquement par npm run infra:worker-secrets (stdin), jamais affiché."
  value       = module.contact_form.turnstile_secret
  sensitive   = true
}

output "contact_form_endpoint" {
  description = "URL du Worker du formulaire (doit égaler SITE.contactEndpoint dans src/config/site.ts)."
  value       = module.contact_form.endpoint
}

output "contact_form_worker_name" {
  description = "Nom du Worker, déployé par `wrangler deploy` (name de worker/wrangler.toml)."
  value       = module.contact_form.worker_name
}
