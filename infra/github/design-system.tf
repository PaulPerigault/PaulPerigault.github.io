# Dépôt PaulPerigault/design-system (paquets npm @paulperigault/*), créé par `gh repo create` puis
# adopté ici (imports.tf). Squash seul, message = corps de la PR (aucune signature d'outil, règle
# commitlint du dépôt). `main` est créée depuis `develop` par l'apply du propriétaire.
locals {
  ds       = var.design_system ? toset(["design-system"]) : toset([])
  ds_check = "ci"
}

resource "github_repository" "design_system" {
  for_each = local.ds

  name         = each.key
  description  = "Design system de paulperigault.fr : tokens DTCG, CSS, composants Astro, garde-fous et CLI"
  homepage_url = "https://ds.paulperigault.dev"
  visibility   = "public"
  topics       = ["design-system", "design-tokens", "astro", "tailwindcss", "accessibility"]

  has_issues      = true
  has_projects    = false
  has_wiki        = false
  has_discussions = false
  is_template     = false

  allow_merge_commit          = false
  allow_squash_merge          = true
  allow_rebase_merge          = false
  allow_auto_merge            = false
  allow_update_branch         = true
  delete_branch_on_merge      = true
  web_commit_signoff_required = false
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"

  archived           = false
  archive_on_destroy = true

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_branch_default" "design_system" {
  for_each = local.ds

  repository = github_repository.design_system[each.key].name
  branch     = "develop"
}

# `main` n'existe pas avant l'apply : créée depuis `develop`, puis protégée par son ruleset.
resource "github_branch" "design_system_main" {
  for_each = local.ds

  repository    = github_repository.design_system[each.key].name
  branch        = "main"
  source_branch = "develop"
}

resource "github_repository_vulnerability_alerts" "design_system" {
  for_each = local.ds

  repository = github_repository.design_system[each.key].name
  enabled    = true
}
