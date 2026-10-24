# Enregistrements CAA de l'apex : seules les autorités listées peuvent émettre un certificat pour le
# domaine et ses sous-domaines (`issue`) ou des certificats génériques (`issuewild`). Une autorité
# absente de la liste est refusée : la liste doit donc rester celle de Cloudflare plus celle des
# hébergeurs d'origine (GitHub Pages : Let's Encrypt).
locals {
  records = {
    for pair in setproduct(["issue", "issuewild"], tolist(var.authorities)) :
    "${pair[0]}-${pair[1]}" => { tag = pair[0], value = pair[1] }
  }
}

resource "cloudflare_dns_record" "caa" {
  for_each = local.records

  zone_id = var.zone_id
  name    = var.domain
  type    = "CAA"
  ttl     = 3600
  proxied = false
  data = {
    flags = 0
    tag   = each.value.tag
    value = each.value.value
  }
  comment = "OpenTofu : autorités de certification admises"
}
