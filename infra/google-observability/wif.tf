# Fédération d'identité (Workload Identity Federation) : le workflow web-presence échange son jeton
# OIDC GitHub contre un jeton Google de courte durée. Deux verrous indépendants :
#   1. la condition du fournisseur rejette tout jeton qui ne vient pas de CE dépôt (nom ET
#      identifiants numériques), de CE workflow, sur CETTE branche, déclenché par planification ou
#      à la main (jamais par une pull request) ;
#   2. seul le principal portant exactement ce workflow peut emprunter le compte de service.
locals {
  workflow_ref_claim = "${var.github_repository}/.github/workflows/${var.workflow_file}@${var.workflow_ref}"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = google_project.observability.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Jetons OIDC des workflows GitHub, restreints par le fournisseur."

  depends_on = [google_project_service.enabled]
}

resource "google_iam_workload_identity_pool_provider" "web_presence" {
  project                            = google_project.observability.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "web-presence"
  display_name                       = "Workflow web-presence"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.job_workflow_ref" = "assertion.job_workflow_ref"
  }

  attribute_condition = join(" && ", [
    "assertion.repository_owner_id == '${var.github_owner_id}'",
    "assertion.repository_id == '${var.github_repository_id}'",
    "assertion.repository == '${var.github_repository}'",
    "assertion.job_workflow_ref == '${local.workflow_ref_claim}'",
    "assertion.event_name in ['schedule', 'workflow_dispatch']",
  ])

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "workflow_impersonation" {
  service_account_id = google_service_account.web_presence.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.job_workflow_ref/${local.workflow_ref_claim}"
}
