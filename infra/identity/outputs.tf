# Toutes les valeurs sont sensibles : lues seulement par npm run infra:identity-push (stdin, fichier
# de secrets, secrets GitHub), jamais affichées. `npm run infra:identity -- output <nom>` les refuse.
output "cloudflare_token_terraform" {
  description = "Jeton de infra/ en local (TF_VAR_cloudflare_api_token du fichier de secrets)."
  value       = cloudflare_account_token.limited["terraform"].value
  sensitive   = true
}

output "cloudflare_token_pages_deploy" {
  description = "Jeton d'envoi vers Pages (secret GitHub CLOUDFLARE_API_TOKEN_PAGES)."
  value       = cloudflare_account_token.limited["pages_deploy"].value
  sensitive   = true
}

output "cloudflare_token_ci_readonly" {
  description = "Jeton de `tofu plan` en CI (secret GitHub CLOUDFLARE_API_TOKEN_READONLY)."
  value       = cloudflare_account_token.limited["ci_readonly"].value
  sensitive   = true
}

output "ovh_client_write" {
  description = "Compte de service OVH d'écriture (OVH_CLIENT_ID / OVH_CLIENT_SECRET du fichier de secrets)."
  value = {
    id     = ovh_me_api_oauth2_client.registrar["write"].client_id
    secret = ovh_me_api_oauth2_client.registrar["write"].client_secret
  }
  sensitive = true
}

output "ovh_client_read" {
  description = "Compte de service OVH de lecture (secrets GitHub OVH_READ_CLIENT_ID / OVH_READ_CLIENT_SECRET)."
  value = {
    id     = ovh_me_api_oauth2_client.registrar["read"].client_id
    secret = ovh_me_api_oauth2_client.registrar["read"].client_secret
  }
  sensitive = true
}
