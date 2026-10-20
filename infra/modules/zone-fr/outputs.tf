output "zone_id" {
  description = "Identifiant de la zone."
  value       = cloudflare_zone.fr.id
}

output "name_servers" {
  description = "Serveurs de noms attribués par Cloudflare, à saisir chez OVH (runbook §4.4)."
  value       = cloudflare_zone.fr.name_servers
}

output "dnssec_ds" {
  description = "Valeurs à saisir chez OVH (runbook §4.6) ; nulles tant que DNSSEC est désactivé."
  value = var.dnssec_enabled ? {
    key_tag     = cloudflare_zone_dnssec.fr.key_tag
    flags       = cloudflare_zone_dnssec.fr.flags
    algorithm   = cloudflare_zone_dnssec.fr.algorithm
    public_key  = cloudflare_zone_dnssec.fr.public_key
    digest_type = cloudflare_zone_dnssec.fr.digest_type
    digest      = cloudflare_zone_dnssec.fr.digest
    ds          = cloudflare_zone_dnssec.fr.ds
  } : null
}
