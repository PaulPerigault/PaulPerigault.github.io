# Variables et environnements GitHub Actions, importés tels qu'ils sont (imports.tf). Les secrets
# Actions sont posés par infra/identity/ (`github_actions_secret`), où leurs valeurs sont déjà.

# Clé de site Turnstile : publique (publiée dans chaque page portant le formulaire).
resource "github_actions_variable" "turnstile_sitekey" {
  repository    = github_repository.portfolio.name
  variable_name = "PUBLIC_TURNSTILE_SITEKEY"
  value         = "0x4AAAAAAFV0gKQ19VAmo-K2"
}

# `copilot` est créé par GitHub ; `github-pages` reste de l'ancien déploiement Pages (ADR-0010).
resource "github_repository_environment" "copilot" {
  repository        = github_repository.portfolio.name
  environment       = "copilot"
  can_admins_bypass = true
}

resource "github_repository_environment" "github_pages" {
  repository        = github_repository.portfolio.name
  environment       = "github-pages"
  can_admins_bypass = true

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}
