# Secrets GitHub Actions du workflow web-presence, lus dans le state de infra/google-observability
# (clé d'API PageSpeed/CrUX, fournisseur de fédération, compte de service). Aucune clé de compte de
# service n'existe : seule la clé d'API est secrète, les deux autres valeurs sont des identifiants.
# Interrupteur `google_observability` : faux tant que la brique n'est pas appliquée (le state
# distant n'existe pas), vrai ensuite, par PR (comme `fr_dnssec`).
data "terraform_remote_state" "google_observability" {
  count   = var.google_observability ? 1 : 0
  backend = "s3"

  config = {
    bucket = "tfstate-portfolio"
    key    = "google-observability/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://5d7f707043c8dbe25d945c965f24880e.r2.cloudflarestorage.com"
    }

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

locals {
  google_secrets = var.google_observability ? {
    GOOGLE_API_KEY                    = data.terraform_remote_state.google_observability[0].outputs.crux_psi_api_key_secret
    GOOGLE_WORKLOAD_IDENTITY_PROVIDER = data.terraform_remote_state.google_observability[0].outputs.workload_identity_provider
    GOOGLE_SERVICE_ACCOUNT            = data.terraform_remote_state.google_observability[0].outputs.service_account_email
  } : {}
}

resource "github_actions_secret" "google" {
  for_each = var.google_observability ? toset([
    "GOOGLE_API_KEY",
    "GOOGLE_WORKLOAD_IDENTITY_PROVIDER",
    "GOOGLE_SERVICE_ACCOUNT",
  ]) : toset([])

  repository  = local.github_repository
  secret_name = each.key
  value       = local.google_secrets[each.key]
}
