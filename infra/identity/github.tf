# Secrets GitHub Actions du dépôt, posés ici parce que leurs valeurs sont déjà dans ce state
# (ADR-0010) : plus de `gh secret set`. Le provider lit GITHUB_TOKEN, que npm run infra:identity
# remplit avec GITHUB_IAC_TOKEN (fine-grained, dépôt PaulPerigault/portfolio, _Secrets : write_).
provider "github" {
  owner = "PaulPerigault"
}

locals {
  github_repository = "portfolio"
  # Noms en clair (clés de for_each), valeurs sensibles ; CLOUDFLARE_API_TOKEN_DEPLOY (Worker) reste
  # hors de cette brique.
  actions_secrets = {
    CLOUDFLARE_API_TOKEN_READONLY = cloudflare_account_token.limited["ci_readonly"].value
    CLOUDFLARE_API_TOKEN_PAGES    = cloudflare_account_token.limited["pages_deploy"].value
    OVH_READ_CLIENT_ID            = ovh_me_api_oauth2_client.registrar["read"].client_id
    OVH_READ_CLIENT_SECRET        = ovh_me_api_oauth2_client.registrar["read"].client_secret
    TFSTATE_R2_READ_ACCESS_KEY_ID = cloudflare_account_token.state_read.id
    TFSTATE_R2_READ_SECRET_KEY    = sha256(cloudflare_account_token.state_read.value)
  }
}

resource "github_actions_secret" "ci" {
  for_each = toset([
    "CLOUDFLARE_API_TOKEN_READONLY",
    "CLOUDFLARE_API_TOKEN_PAGES",
    "OVH_READ_CLIENT_ID",
    "OVH_READ_CLIENT_SECRET",
    "TFSTATE_R2_READ_ACCESS_KEY_ID",
    "TFSTATE_R2_READ_SECRET_KEY",
  ])

  repository  = local.github_repository
  secret_name = each.key
  value       = local.actions_secrets[each.key]
}
