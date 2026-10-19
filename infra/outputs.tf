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

output "pages_site_url" {
  description = "Adresse *.pages.dev du site sur Cloudflare Pages (avant domaine personnalisé)."
  value       = module.pages_site.pages_dev_url
}

output "fr_name_servers" {
  description = "Serveurs de noms Cloudflare de paulperigault.fr, à saisir chez OVH (runbook §4.4)."
  value       = module.zone_fr.name_servers
}

output "fr_dnssec_ds" {
  description = "Key Tag, Flags, Algorithm, Public Key (et DS complet) à publier chez OVH (runbook §4.6) ; null tant que fr_dnssec vaut false."
  value       = module.zone_fr.dnssec_ds
}
