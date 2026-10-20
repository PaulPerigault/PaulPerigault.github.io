# Protections et Actions du dépôt design-system : rulesets `develop` et `main` (PR obligatoire,
# squash seul, check `ci`, 0 approbation : projet mené seul), actions autorisées restreintes,
# environnements protégés pour la publication npm (OIDC) et le déploiement des docs.
resource "github_repository_ruleset" "design_system" {
  for_each = { for pair in setproduct(tolist(local.ds), ["develop", "main"]) : pair[1] => pair[0] }

  name        = "${each.key}-protect"
  repository  = github_repository.design_system[each.value].name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/${each.key}"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      allowed_merge_methods             = ["squash"]
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_approving_review_count   = 0
      required_review_thread_resolution = false
    }

    required_status_checks {
      strict_required_status_checks_policy = true
      do_not_enforce_on_create             = true

      required_check {
        context = local.ds_check
      }
    }
  }

  depends_on = [github_branch.design_system_main]
}

# Actions : celles de GitHub et la liste fermée des actions tierces épinglées par SHA.
resource "github_actions_repository_permissions" "design_system" {
  for_each = local.ds

  repository      = github_repository.design_system[each.key].name
  enabled         = true
  allowed_actions = "selected"

  allowed_actions_config {
    github_owned_allowed = true
    verified_allowed     = false
    patterns_allowed     = ["googleapis/release-please-action@*", "zizmorcore/zizmor-action@*"]
  }
}

# Environnements déployables depuis `main` seulement : publication npm (trusted publishing) et
# déploiement des docs (secret Pages posé par infra/identity).
locals {
  ds_environments = {
    for pair in setproduct(tolist(local.ds), ["npm-publish", "docs-deploy"]) : pair[1] => pair[0]
  }
}

resource "github_repository_environment" "design_system" {
  for_each = local.ds_environments

  repository          = github_repository.design_system[each.value].name
  environment         = each.key
  can_admins_bypass   = false
  prevent_self_review = false

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "design_system" {
  for_each = local.ds_environments

  repository     = github_repository.design_system[each.value].name
  environment    = github_repository_environment.design_system[each.key].environment
  branch_pattern = "main"
}
