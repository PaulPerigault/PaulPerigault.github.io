# Brique identité avec des providers simulés : aucun appel à Cloudflare ni à OVH (`tofu test`).
mock_provider "ovh" {}

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
    condition     = toset(keys(cloudflare_account_token.limited)) == toset(["terraform", "pages_deploy", "ci_readonly"])
    error_message = "Trois jetons : terraform, pages-deploy, lecture seule de la CI."
  }

  assert {
    condition     = length(cloudflare_account_token.limited["pages_deploy"].policies) == 1 && [for group in cloudflare_account_token.limited["pages_deploy"].policies[0].permission_groups : group.id] == ["Pages Write"]
    error_message = "pages-deploy : Pages Write sur le compte, rien d'autre."
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
