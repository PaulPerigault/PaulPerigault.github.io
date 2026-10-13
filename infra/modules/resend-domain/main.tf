# Domaine d'envoi Resend (région UE, Irlande) : clé DKIM et chemin de retour. Créés à la main dans
# Cloudflare lors de la vérification du domaine, puis importés (blocs `import` de infra/imports.tf) :
# Terraform les décrit sans les recréer. Les valeurs doivent rester celles données par Resend.

resource "cloudflare_dns_record" "dkim" {
  zone_id = var.zone_id
  name    = "resend._domainkey.${var.domain}"
  type    = "TXT"
  content = "\"p=${var.dkim_public_key}\""
  ttl     = 3600
  proxied = false
}

resource "cloudflare_dns_record" "return_path" {
  for_each = var.return_path_targets

  zone_id = var.zone_id
  name    = "${each.key}.${var.domain}"
  type    = "CNAME"
  content = each.value
  ttl     = 3600
  proxied = false
}

# Politique DMARC du domaine d'envoi (Resend est le seul expéditeur de paulperigault.dev). Créée par
# Terraform (aucun enregistrement n'existait), en mode observation d'abord : voir ROADMAP.md.
resource "cloudflare_dns_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  content = "\"${var.dmarc_policy}\""
  ttl     = 3600
  proxied = false
}
