# Enregistrements recopiés de la zone OVH (export du 2026-10-19, #181), tous en DNS seul : la
# messagerie iCloud et les vérifications de propriété ne passent jamais par le proxy.
locals {
  txt = {
    spf    = { name = var.domain, value = "v=spf1 include:icloud.com ~all" }
    apple  = { name = var.domain, value = "apple-domain=${var.apple_domain_token}" }
    google = { name = var.domain, value = "google-site-verification=${var.google_site_verification}" }
    # Autorise les rapports DMARC de paulperigault.dev vers une adresse du .fr (RFC 7489 §7.1).
    dmarc_report = { name = "paulperigault.dev._report._dmarc.${var.domain}", value = "v=DMARC1" }
  }
}

resource "cloudflare_dns_record" "mx" {
  for_each = toset(var.mx_hosts)

  zone_id  = cloudflare_zone.fr.id
  name     = var.domain
  type     = "MX"
  content  = each.value
  priority = 10
  ttl      = 3600
  proxied  = false
}

resource "cloudflare_dns_record" "txt" {
  for_each = local.txt

  zone_id = cloudflare_zone.fr.id
  name    = each.value.name
  type    = "TXT"
  content = "\"${each.value.value}\""
  ttl     = 3600
  proxied = false
}

resource "cloudflare_dns_record" "dkim" {
  zone_id = cloudflare_zone.fr.id
  name    = "sig1._domainkey.${var.domain}"
  type    = "CNAME"
  content = "sig1.dkim.${var.domain}.at.icloudmailadmin.com"
  ttl     = 3600
  proxied = false
}
