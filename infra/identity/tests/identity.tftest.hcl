# Brique identité avec des providers simulés : aucun appel à Cloudflare ni à OVH (`tofu test`).
mock_provider "ovh" {}

mock_provider "cloudflare" {
  override_data {
    target = data.cloudflare_account_api_token_permission_groups_list.all
    values = {
      result = [
        for name in [
          "Turnstile Sites Write", "Workers Scripts Write", "Pages Write", "Zone Write", "DNS Write",
          "Workers Routes Write", "Dynamic URL Redirects Write", "Zone WAF Write", "Zone Settings Write",
          "Bot Management Write", "Zone Transform Rules Read", "Turnstile Sites Read",
          "Workers Scripts Read", "Pages Read", "Zone Read", "DNS Read", "Workers Routes Read",
          "Dynamic URL Redirects Read", "Zone WAF Read", "Zone Settings Read", "Bot Management Read",
        ] : { name = name, id = name, category = "test", is_selectable = true, scopes = [] }
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

  expect_failures = [cloudflare_account_token.limited]
}

run "ip_invalide_refusee" {
  command = plan

  variables {
    owner_ip = "192.0.2.10/24"
  }

  expect_failures = [var.owner_ip]
}
