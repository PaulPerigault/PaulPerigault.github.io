# Module canonical-redirect avec un provider simulé (`tofu test`).
mock_provider "cloudflare" {}

variables {
  zone_id       = "00000000000000000000000000000000"
  hosts         = ["paulperigault.dev", "www.paulperigault.dev"]
  target_origin = "https://paulperigault.fr"
}

run "redirection_301_chemin_et_parametres" {
  command = plan

  module {
    source = "./modules/canonical-redirect"
  }

  assert {
    condition     = cloudflare_ruleset.redirect.phase == "http_request_dynamic_redirect" && cloudflare_ruleset.redirect.kind == "zone"
    error_message = "Ruleset de zone de la phase de redirection dynamique."
  }

  assert {
    condition     = cloudflare_ruleset.redirect.rules[0].expression == "http.host in {\"paulperigault.dev\" \"www.paulperigault.dev\"}"
    error_message = "L'apex et www sont tous deux couverts (www manquait, #181)."
  }

  assert {
    condition     = cloudflare_ruleset.redirect.rules[0].action_parameters.from_value.status_code == 301 && cloudflare_ruleset.redirect.rules[0].action_parameters.from_value.preserve_query_string
    error_message = "301 et paramètres conservés."
  }

  assert {
    condition     = cloudflare_ruleset.redirect.rules[0].action_parameters.from_value.target_url.expression == "concat(\"https://paulperigault.fr\", http.request.uri.path)"
    error_message = "Cible : origine canonique + chemin de la requête."
  }
}

run "origine_avec_barre_refusee" {
  command = plan

  module {
    source = "./modules/canonical-redirect"
  }

  variables {
    target_origin = "https://paulperigault.fr/"
  }

  expect_failures = [var.target_origin]
}
