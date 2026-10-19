# Hébergement du site : GitHub Pages (DNS seul, comme chez OVH) tant que `pages_target` est nul,
# puis Cloudflare Pages (CNAME proxifiés, runbook §5). Un CNAME ne peut pas coexister avec un A du
# même nom : `depends_on` fait détruire les enregistrements GitHub avant de créer ceux de Pages
# (arête « création → destruction » relevée avec `tofu graph -plan`, ADR-0008).
locals {
  on_pages = var.pages_target != null
  github_pages = local.on_pages ? {} : merge(
    { for ip in var.github_pages_ipv4 : "apex-${ip}" => { name = var.domain, type = "A", content = ip } },
    { www = { name = "www.${var.domain}", type = "CNAME", content = var.github_pages_host } },
  )
  pages = local.on_pages ? toset([var.domain, "www.${var.domain}"]) : toset([])
}

resource "cloudflare_dns_record" "github_pages" {
  for_each = local.github_pages

  zone_id = cloudflare_zone.fr.id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  ttl     = 3600
  proxied = false
}

resource "cloudflare_dns_record" "pages" {
  for_each = local.pages

  zone_id = cloudflare_zone.fr.id
  name    = each.value
  type    = "CNAME"
  content = var.pages_target
  # TTL automatique, obligatoire pour un enregistrement proxifié.
  ttl     = 1
  proxied = true

  depends_on = [cloudflare_dns_record.github_pages]
}
