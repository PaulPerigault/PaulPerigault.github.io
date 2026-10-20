# Un CNAME proxifié vers un projet Cloudflare Pages : active le domaine personnalisé déclaré par le
# module `pages-site` (un domaine Pages ne sert qu'avec l'enregistrement qui le vise).
resource "cloudflare_dns_record" "cname" {
  zone_id = var.zone_id
  name    = var.name
  type    = "CNAME"
  content = var.target
  # TTL automatique, obligatoire pour un enregistrement proxifié.
  ttl     = 1
  proxied = true
  comment = "OpenTofu : ${var.name} vers Cloudflare Pages"
}
