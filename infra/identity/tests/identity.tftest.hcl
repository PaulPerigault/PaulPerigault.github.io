# Brique identité avec des providers simulés : aucun appel à Cloudflare ni à OVH (`tofu test`).
mock_provider "ovh" {}

mock_provider "github" {}

mock_provider "cloudflare" {
  override_data {
    target = data.cloudflare_account_api_token_permission_groups_list.all
    values = {
      result = [
        { name = "Turnstile Sites Write", id = "Turnstile Sites Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Scripts Write", id = "Workers Scripts Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Pages Write", id = "Pages Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Write", id = "Zone Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "DNS Write", id = "DNS Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Routes Write", id = "Workers Routes Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Dynamic URL Redirects Write", id = "Dynamic URL Redirects Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone WAF Write", id = "Zone WAF Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Settings Write", id = "Zone Settings Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Bot Management Write", id = "Bot Management Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Transform Rules Read", id = "Zone Transform Rules Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Turnstile Sites Read", id = "Turnstile Sites Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Scripts Read", id = "Workers Scripts Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Pages Read", id = "Pages Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Read", id = "Zone Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "DNS Read", id = "DNS Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Routes Read", id = "Workers Routes Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Dynamic URL Redirects Read", id = "Dynamic URL Redirects Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone WAF Read", id = "Zone WAF Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Settings Read", id = "Zone Settings Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Bot Management Read", id = "Bot Management Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers R2 Storage Bucket Item Read", id = "r2-item-read", category = "test", is_selectable = true, scopes = ["com.cloudflare.edge.r2.bucket"] },
      ]
    }
  }
}

variables {
  bootstrap_cloudflare_token       = "jeton-factice"
  bootstrap_ovh_application_key    = "cle-factice"
  bootstrap_ovh_application_secret = "secret-factice"
  bootstrap_ovh_consumer_key       = "consommateur-factice"
  owner_ip                         = "192.0.2.10"
}

run "jetons_cloudflare_au_plus_juste" {
  command = plan

  assert {
    condition     = toset(keys(cloudflare_account_token.limited)) == toset(["terraform", "pages_deploy", "ds_pages_deploy", "ci_readonly"])
    error_message = "Quatre jetons : terraform, pages-deploy (site), ds-pages-deploy (docs), lecture seule de la CI."
  }

  assert {
    condition     = length(cloudflare_account_token.limited["pages_deploy"].policies) == 1 && [for group in cloudflare_account_token.limited["pages_deploy"].policies[0].permission_groups : group.id] == ["Pages Write"]
    error_message = "pages-deploy : Pages Write sur le compte, rien d'autre."
  }

  assert {
    condition     = length(cloudflare_account_token.limited["ds_pages_deploy"].policies) == 1 && [for group in cloudflare_account_token.limited["ds_pages_deploy"].policies[0].permission_groups : group.id] == ["Pages Write"]
    error_message = "ds-pages-deploy : Pages Write sur le compte, rien d'autre."
  }

  assert {
    condition     = alltrue([for policy in cloudflare_account_token.limited["ci_readonly"].policies : alltrue([for group in policy.permission_groups : !endswith(group.id, " Write")])])
    error_message = "Le jeton de la CI n'a aucune permission d'écriture."
  }

  assert {
    condition     = jsondecode(cloudflare_account_token.limited["terraform"].policies[1].resources) == { "com.cloudflare.api.account.5d7f707043c8dbe25d945c965f24880e" = { "com.cloudflare.api.account.zone.*" = "*" } }
    error_message = "Jeton terraform : toutes les zones du compte (la zone .fr n'existe pas encore)."
  }

  assert {
    condition     = alltrue([for token in cloudflare_account_token.limited : token.expires_on == "2027-10-19T00:00:00Z"])
    error_message = "Chaque jeton expire."
  }
}

run "groupes_choisis_par_portee" {
  command = plan

  override_data {
    target = data.cloudflare_account_api_token_permission_groups_list.all
    values = {
      result = [
        { name = "Turnstile Sites Write", id = "Turnstile Sites Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Scripts Write", id = "Workers Scripts Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Write", id = "Zone Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "DNS Write", id = "DNS Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Routes Write", id = "Workers Routes Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Dynamic URL Redirects Write", id = "Dynamic URL Redirects Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone WAF Write", id = "Zone WAF Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Settings Write", id = "Zone Settings Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Bot Management Write", id = "Bot Management Write", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Transform Rules Read", id = "Zone Transform Rules Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Turnstile Sites Read", id = "Turnstile Sites Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Scripts Read", id = "Workers Scripts Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Pages Read", id = "Pages Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Read", id = "Zone Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "DNS Read", id = "DNS Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Workers Routes Read", id = "Workers Routes Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Dynamic URL Redirects Read", id = "Dynamic URL Redirects Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone WAF Read", id = "Zone WAF Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Zone Settings Read", id = "Zone Settings Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        { name = "Bot Management Read", id = "Bot Management Read", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account", "com.cloudflare.api.account.zone"] },
        # Même nom en portée zone (identifiant différent), et entrée de compte répétée.
        { name = "Pages Write", id = "pages-zone", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account.zone"] },
        { name = "Pages Write", id = "pages-compte", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account"] },
        { name = "Pages Write", id = "pages-compte", category = "test", is_selectable = true, scopes = ["com.cloudflare.api.account"] },
        { name = "Workers R2 Storage Bucket Item Read", id = "r2-item-read", category = "test", is_selectable = true, scopes = ["com.cloudflare.edge.r2.bucket"] },
      ]
    }
  }

  assert {
    condition     = [for group in cloudflare_account_token.limited["pages_deploy"].policies[0].permission_groups : group.id] == ["pages-compte"]
    error_message = "Pages Write est pris dans la portée compte, une seule fois."
  }
}

run "cles_r2_du_state_en_lecture_seule" {
  command = plan

  assert {
    condition     = [for group in cloudflare_account_token.state_read.policies[0].permission_groups : group.id] == ["r2-item-read"]
    error_message = "Un seul groupe : lecture des objets R2."
  }

  assert {
    condition     = jsondecode(cloudflare_account_token.state_read.policies[0].resources) == { "com.cloudflare.edge.r2.bucket.5d7f707043c8dbe25d945c965f24880e_default_tfstate-portfolio" = "*" }
    error_message = "Le seul bucket tfstate-portfolio du compte."
  }

  assert {
    condition     = cloudflare_account_token.state_read.expires_on == "2027-10-19T00:00:00Z"
    error_message = "Le jeton expire."
  }
}

run "secrets_actions_du_depot" {
  command = plan

  assert {
    condition = toset(keys(github_actions_secret.ci)) == toset([
      "CLOUDFLARE_API_TOKEN_READONLY", "CLOUDFLARE_API_TOKEN_PAGES", "OVH_READ_CLIENT_ID",
      "OVH_READ_CLIENT_SECRET", "TFSTATE_R2_READ_ACCESS_KEY_ID", "TFSTATE_R2_READ_SECRET_KEY",
    ])
    error_message = "Les six secrets Actions de la CI, rien d'autre."
  }

  assert {
    condition     = alltrue([for secret in github_actions_secret.ci : secret.repository == "portfolio"])
    error_message = "Le seul dépôt PaulPerigault/portfolio."
  }

  assert {
    condition     = github_actions_environment_secret.ds_docs_pages.repository == "design-system" && github_actions_environment_secret.ds_docs_pages.environment == "docs-deploy" && github_actions_environment_secret.ds_docs_pages.secret_name == "CLOUDFLARE_API_TOKEN_PAGES"
    error_message = "Jeton Pages des docs : secret de l'environnement docs-deploy du dépôt design-system seulement."
  }
}

run "secrets_google_absents_tant_que_la_brique_n_est_pas_appliquee" {
  command = plan

  assert {
    condition     = length(github_actions_secret.google) == 0 && length(data.terraform_remote_state.google_observability) == 0
    error_message = "Par défaut, aucun secret Google et aucune lecture du state distant (la brique n'existe pas encore)."
  }
}

run "secrets_google_lus_dans_le_state_de_la_brique" {
  command = plan

  variables {
    google_observability = true
  }

  override_data {
    target = data.terraform_remote_state.google_observability[0]
    values = {
      outputs = {
        crux_psi_api_key_secret    = "cle-factice"
        workload_identity_provider = "projects/1/locations/global/workloadIdentityPools/github-actions/providers/web-presence"
        service_account_email      = "web-presence@paulperigault-observability.iam.gserviceaccount.com"
      }
    }
  }

  assert {
    condition     = toset(keys(github_actions_secret.google)) == toset(["GOOGLE_API_KEY", "GOOGLE_WORKLOAD_IDENTITY_PROVIDER", "GOOGLE_SERVICE_ACCOUNT"])
    error_message = "Trois secrets : clé d'API, fournisseur de fédération, compte de service. Jamais de clé de compte de service."
  }

  assert {
    condition     = alltrue([for secret in github_actions_secret.google : secret.repository == "portfolio"])
    error_message = "Le seul dépôt PaulPerigault/portfolio."
  }
}

run "politiques_ovh_limitees_au_domaine" {
  command = plan

  assert {
    condition     = ovh_iam_policy.registrar_write.resources == toset(["urn:v1:eu:resource:domain:paulperigault.fr"]) && ovh_iam_policy.registrar_read.resources == toset(["urn:v1:eu:resource:domain:paulperigault.fr"])
    error_message = "Seule ressource : le domaine paulperigault.fr."
  }

  assert {
    condition     = toset(ovh_iam_policy.registrar_write.allow) == toset(["domain:apiovh:nameServer/get", "domain:apiovh:nameServer/edit", "domain:apiovh:dsRecord/get", "domain:apiovh:dsRecord/create", "domain:apiovh:task/get"])
    error_message = "Écriture : nameServer, dsRecord et task, rien d'autre."
  }

  assert {
    condition     = toset(ovh_iam_policy.registrar_read.allow) == toset(["domain:apiovh:nameServer/get", "domain:apiovh:dsRecord/get"])
    error_message = "Lecture : nameServer et dsRecord en lecture seule."
  }

  assert {
    condition     = alltrue([for action in setunion(ovh_iam_policy.registrar_write.allow, ovh_iam_policy.registrar_read.allow) : !can(regex("(?i)authInfo|transfer|owner|contact|\\*", action))])
    error_message = "Aucun droit sur authInfo, le transfert, le titulaire, les contacts, ni joker."
  }

  assert {
    condition     = ovh_iam_policy.registrar_write.conditions[0].values["request.IP"] == "192.0.2.10" && length(ovh_iam_policy.registrar_read.conditions) == 0
    error_message = "L'écriture n'est admise que depuis l'IP du propriétaire."
  }
}

run "groupe_inconnu_refuse" {
  command = plan

  override_data {
    target = data.cloudflare_account_api_token_permission_groups_list.all
    values = {
      result = [{ name = "Pages Write", id = "Pages Write", category = "test", is_selectable = true, scopes = [] }]
    }
  }

  expect_failures = [cloudflare_account_token.limited, cloudflare_account_token.state_read]
}

run "ip_invalide_refusee" {
  command = plan

  variables {
    owner_ip = "192.0.2.10/24"
  }

  expect_failures = [var.owner_ip]
}
