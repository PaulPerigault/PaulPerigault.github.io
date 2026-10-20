# Le dépôt lui-même, importé tel qu'il est (imports.tf). Jamais détruit : `prevent_destroy`, et
# `archive_on_destroy` si la ressource sortait un jour du code ; scripts/lib/tf-plan-guard.mjs
# refuse aussi tout plan qui le détruit, même listé dans allowed-destroys.txt.
locals {
  repository = "portfolio"
}

resource "github_repository" "portfolio" {
  name        = local.repository
  description = "Portfolio personnel"
  # Champ « Website » ; pas de bloc `pages` : GitHub Pages est désactivé (check plus bas).
  homepage_url = "https://paulperigault.fr"
  visibility   = "public"
  topics       = ["angular", "github-pages", "portfolio", "tailwind", "typescript"]

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = false
  is_template     = false

  allow_merge_commit          = true
  allow_squash_merge          = true
  allow_rebase_merge          = true
  allow_auto_merge            = true
  allow_update_branch         = false
  delete_branch_on_merge      = false
  web_commit_signoff_required = false
  squash_merge_commit_title   = "COMMIT_OR_PR_TITLE"
  squash_merge_commit_message = "COMMIT_MESSAGES"
  merge_commit_title          = "MERGE_MESSAGE"
  merge_commit_message        = "PR_TITLE"

  archived           = false
  archive_on_destroy = true

  security_and_analysis {
    secret_scanning {
      status = "disabled"
    }
    secret_scanning_push_protection {
      status = "disabled"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_branch_default" "develop" {
  repository = github_repository.portfolio.name
  branch     = "develop"
}

# Alertes Dependabot actives ; les PR de correctif automatiques restent désactivées (les mises à
# jour passent par .github/dependabot.yml et dependabot-auto-merge.yml).
resource "github_repository_vulnerability_alerts" "portfolio" {
  repository = github_repository.portfolio.name
  enabled    = true
}

resource "github_repository_dependabot_security_updates" "portfolio" {
  repository = github_repository.portfolio.name
  enabled    = false
}

# Le signalement privé de vulnérabilités (SECURITY.md) n'a pas de ressource dans le provider 6.13 :
# activé à la main, hors de cette brique (ADR-0010). GitHub Pages n'est pas géré, seulement surveillé.
data "github_repository" "portfolio" {
  full_name = "PaulPerigault/${local.repository}"
}

check "pages_desactive" {
  assert {
    condition     = length(data.github_repository.portfolio.pages) == 0
    error_message = "GitHub Pages est réactivé sur le dépôt : le site est servi par Cloudflare Pages seul."
  }
}
