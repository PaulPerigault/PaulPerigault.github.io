# Délégation d'un domaine chez OVH : serveurs de noms (jamais supprimés) et DS de la zone signée.
locals {
  on_cloudflare = alltrue([for host in var.name_servers : endswith(host, ".ns.cloudflare.com")])
}

# Jamais supprimés : une suppression rendrait la délégation à OVH par `PUT /domain`, droit que le
# compte de service n'a pas.
resource "ovh_domain_name_servers" "fr" {
  domain = var.domain

  dynamic "servers" {
    for_each = var.name_servers
    content {
      host = servers.value
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# DS de la clé de signature de Cloudflare (algorithme 13). Sans enregistrement : aucun DS au registre.
# Retirer la liste supprime le DS (retour arrière, runbook §4.7).
resource "ovh_domain_ds_records" "fr" {
  count = length(var.ds_records) > 0 ? 1 : 0

  domain = var.domain

  dynamic "ds_records" {
    for_each = var.ds_records
    content {
      algorithm  = "ECDSAP256SHA256"
      flags      = "KEY_SIGNING_KEY"
      public_key = ds_records.value.public_key
      tag        = ds_records.value.key_tag
    }
  }

  lifecycle {
    precondition {
      condition     = local.on_cloudflare
      error_message = "Un DS ne se publie qu'une fois les serveurs de noms Cloudflare en place (runbook §4.6)."
    }
  }

  depends_on = [ovh_domain_name_servers.fr]
}
