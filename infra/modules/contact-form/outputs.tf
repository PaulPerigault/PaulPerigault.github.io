output "turnstile_sitekey" {
  description = "Clé de site Turnstile (publique)."
  value       = cloudflare_turnstile_widget.contact.sitekey
}

output "turnstile_secret" {
  description = "Secret Turnstile, à fournir au Worker (TURNSTILE_SECRET)."
  value       = cloudflare_turnstile_widget.contact.secret
  sensitive   = true
}

output "endpoint" {
  description = "URL publique du Worker."
  value       = "https://${cloudflare_workers_custom_domain.contact.hostname}/"
}

output "worker_name" {
  description = "Nom du Worker."
  value       = cloudflare_worker.contact.name
}
