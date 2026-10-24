output "records" {
  description = "Enregistrements CAA déclarés, par clé `<tag>-<autorité>`."
  value       = keys(cloudflare_dns_record.caa)
}
