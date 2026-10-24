# Brique google-observability avec un provider simulé : aucun appel à Google Cloud (`tofu test`).
mock_provider "google" {
  # Valeurs calculées plausibles : le provider valide leur format avant tout appel.
  mock_resource "google_service_account" {
    defaults = {
      name  = "projects/paulperigault-observability/serviceAccounts/web-presence@paulperigault-observability.iam.gserviceaccount.com"
      email = "web-presence@paulperigault-observability.iam.gserviceaccount.com"
    }
  }

  mock_resource "google_iam_workload_identity_pool" {
    defaults = {
      name = "projects/123456789012/locations/global/workloadIdentityPools/github-actions"
    }
  }

  mock_resource "google_iam_workload_identity_pool_provider" {
    defaults = {
      name = "projects/123456789012/locations/global/workloadIdentityPools/github-actions/providers/web-presence"
    }
  }

  mock_resource "google_apikeys_key" {
    defaults = {
      key_string = "cle-factice"
    }
  }
}

run "api_activees" {
  command = plan

  assert {
    condition     = alltrue([for api in ["searchconsole.googleapis.com", "pagespeedonline.googleapis.com", "chromeuxreport.googleapis.com"] : contains(keys(google_project_service.enabled), api)])
    error_message = "Search Console, PageSpeed Insights et CrUX doivent être activées."
  }

  assert {
    condition     = alltrue([for service in google_project_service.enabled : !service.disable_on_destroy])
    error_message = "Aucune API n'est désactivée par une destruction."
  }
}

run "projet_protege_et_sans_facturation_par_defaut" {
  command = plan

  assert {
    condition     = google_project.observability.deletion_policy == "PREVENT"
    error_message = "Le projet ne peut pas être supprimé par un apply."
  }

  assert {
    condition     = google_project.observability.billing_account == null && google_project.observability.org_id == null
    error_message = "Ni facturation ni organisation par défaut."
  }
}

run "federation_restreinte_au_depot_et_au_workflow" {
  command = plan

  assert {
    condition = alltrue([
      strcontains(google_iam_workload_identity_pool_provider.web_presence.attribute_condition, "assertion.repository == 'PaulPerigault/portfolio'"),
      strcontains(google_iam_workload_identity_pool_provider.web_presence.attribute_condition, "assertion.repository_id == '670824524'"),
      strcontains(google_iam_workload_identity_pool_provider.web_presence.attribute_condition, "assertion.repository_owner_id == '86080467'"),
      strcontains(google_iam_workload_identity_pool_provider.web_presence.attribute_condition, "assertion.job_workflow_ref == 'PaulPerigault/portfolio/.github/workflows/web-presence.yml@refs/heads/develop'"),
    ])
    error_message = "La condition doit nommer le dépôt (nom et identifiants), le workflow web-presence.yml et la branche develop."
  }

  assert {
    condition     = strcontains(google_iam_workload_identity_pool_provider.web_presence.attribute_condition, "assertion.event_name in ['schedule', 'workflow_dispatch']")
    error_message = "Une pull request ne doit jamais obtenir de jeton."
  }

  assert {
    condition     = google_iam_workload_identity_pool_provider.web_presence.oidc[0].issuer_uri == "https://token.actions.githubusercontent.com"
    error_message = "Émetteur OIDC de GitHub Actions."
  }
}

run "emprunt_du_compte_reserve_au_workflow" {
  command = plan

  assert {
    condition     = google_service_account_iam_member.workflow_impersonation.role == "roles/iam.workloadIdentityUser"
    error_message = "Seul workloadIdentityUser, pas tokenCreator ni admin."
  }

  assert {
    condition     = strcontains(google_service_account_iam_member.workflow_impersonation.member, "/attribute.job_workflow_ref/PaulPerigault/portfolio/.github/workflows/web-presence.yml@refs/heads/develop")
    error_message = "Le principal est le workflow exact, pas tout le dépôt."
  }

  assert {
    condition     = startswith(google_service_account_iam_member.workflow_impersonation.member, "principalSet://iam.googleapis.com/")
    error_message = "Principal de fédération (principalSet)."
  }
}

run "compte_de_service_sans_droit_de_donnees" {
  command = plan

  assert {
    condition     = google_project_iam_member.consume_apis.role == "roles/serviceusage.serviceUsageConsumer"
    error_message = "Le seul rôle de projet est serviceUsageConsumer (ni viewer, ni editor, ni owner)."
  }
}

run "cle_api_limitee_a_pagespeed_et_crux" {
  command = plan

  assert {
    condition     = toset([for target in google_apikeys_key.psi_crux.restrictions[0].api_targets : target.service]) == toset(["pagespeedonline.googleapis.com", "chromeuxreport.googleapis.com"])
    error_message = "La clé n'ouvre que PageSpeed Insights et CrUX."
  }
}

run "etiquette_refusee_comme_reference" {
  command = plan

  variables {
    workflow_ref = "refs/tags/v1"
  }

  expect_failures = [var.workflow_ref]
}

run "identifiant_de_depot_non_numerique_refuse" {
  command = plan

  variables {
    github_repository_id = "portfolio"
  }

  expect_failures = [var.github_repository_id]
}

run "identifiant_de_projet_invalide_refuse" {
  command = plan

  variables {
    project_id = "Majuscules_Interdites"
  }

  expect_failures = [var.project_id]
}
