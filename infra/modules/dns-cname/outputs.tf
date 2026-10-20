output "hostname" {
  description = "Nom servi par l'enregistrement."
  value       = cloudflare_dns_record.cname.name
}
