# Limitation de débit du module contact-form, contrainte par l'offre gratuite (`tofu test`).
mock_provider "cloudflare" {}

variables {
  account_id        = "compte-de-test"
  zone_id           = "00000000000000000000000000000000"
  hostname          = "contact.paulperigault.dev"
  turnstile_domains = ["paulperigault.fr"]
}

run "regle_compatible_offre_gratuite" {
  command = plan

  module {
    source = "./modules/contact-form"
  }

  assert {
    condition     = cloudflare_ruleset.rate_limit.phase == "http_ratelimit" && length(cloudflare_ruleset.rate_limit.rules) == 1
    error_message = "Une seule règle (limite de l'offre gratuite)."
  }

  assert {
    condition     = cloudflare_ruleset.rate_limit.rules[0].ratelimit.period == 10 && cloudflare_ruleset.rate_limit.rules[0].ratelimit.mitigation_timeout == 10
    error_message = "Offre gratuite : période et blocage de 10 s."
  }

  assert {
    condition     = toset(cloudflare_ruleset.rate_limit.rules[0].ratelimit.characteristics) == toset(["cf.colo.id", "ip.src"]) && cloudflare_ruleset.rate_limit.rules[0].ratelimit.counting_expression == null
    error_message = "Compteur par IP (et par centre de données), sans expression de comptage."
  }

  assert {
    condition     = cloudflare_ruleset.rate_limit.rules[0].expression == "(http.request.uri.path eq \"/\")" && !strcontains(cloudflare_ruleset.rate_limit.rules[0].expression, "http.host") && !strcontains(cloudflare_ruleset.rate_limit.rules[0].expression, "method")
    error_message = "Offre gratuite : filtre sur le chemin seulement."
  }

  assert {
    condition     = cloudflare_ruleset.rate_limit.rules[0].action == "block" && cloudflare_ruleset.rate_limit.rules[0].ratelimit.requests_per_period == 5
    error_message = "Blocage au-delà de 5 requêtes par 10 s."
  }
}

run "seuil_trop_bas_refuse" {
  command = plan

  module {
    source = "./modules/contact-form"
  }

  variables {
    rate_limit_requests = 1
  }

  expect_failures = [var.rate_limit_requests]
}
