output "project_name" {
  description = "Nom du projet Pages (cible de `wrangler pages deploy dist --project-name`)."
  value       = cloudflare_pages_project.site.name
}

output "pages_dev_url" {
  description = "Adresse `*.pages.dev` du projet, avant tout domaine personnalisé."
  value       = "https://${cloudflare_pages_project.site.subdomain}"
}

output "custom_domains" {
  description = "Domaines personnalisés déclarés."
  value       = sort([for domain in cloudflare_pages_domain.site : domain.name])
}
