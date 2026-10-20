# Clés S3 en lecture seule du state OpenTofu, pour la CI (`tofu-plan` de ci.yml, registrar-drift.yml).
# R2 dérive les clés S3 d'un jeton d'API : Access Key ID = identifiant du jeton, Secret Access Key =
# SHA-256 de sa valeur (developers.cloudflare.com/r2/api/tokens). Portée : le seul bucket
# `tfstate-portfolio` (juridiction `default` : point d'accès <compte>.r2.cloudflarestorage.com).
locals {
  state_bucket  = "tfstate-portfolio"
  bucket_scope  = "com.cloudflare.edge.r2.bucket"
  r2_read_group = "Workers R2 Storage Bucket Item Read"
  r2_read_ids = distinct([
    for group in data.cloudflare_account_api_token_permission_groups_list.all.result :
    group.id if group.name == local.r2_read_group && contains(group.scopes, local.bucket_scope)
  ])
}

resource "cloudflare_account_token" "state_read" {
  account_id = var.account_id

  name = "portfolio-tfstate-read"
  policies = [{
    effect            = "allow"
    permission_groups = [{ id = try(local.r2_read_ids[0], null) }]
    resources         = jsonencode({ "${local.bucket_scope}.${var.account_id}_default_${local.state_bucket}" = "*" })
  }]
  expires_on = var.token_expires_on

  lifecycle {
    precondition {
      condition     = length(local.r2_read_ids) == 1
      error_message = "Groupe « ${local.r2_read_group} » (portée bucket) absent ou ambigu chez Cloudflare."
    }
  }
}
