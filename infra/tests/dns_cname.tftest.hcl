# Module dns-cname avec un provider simulé : aucun appel à Cloudflare, aucun secret (`tofu test`).
mock_provider "cloudflare" {}

variables {
  zone_id = "zone-de-test"
  name    = "design.paulperigault.dev"
  target  = "paulperigault-ds.pages.dev"
}

run "cname_proxifie_vers_pages" {
  command = plan

  module {
    source = "./modules/dns-cname"
  }

  assert {
    condition     = cloudflare_dns_record.cname.type == "CNAME" && cloudflare_dns_record.cname.proxied == true
    error_message = "Un CNAME proxifié est attendu."
  }

  assert {
    condition     = cloudflare_dns_record.cname.ttl == 1 && cloudflare_dns_record.cname.content == "paulperigault-ds.pages.dev"
    error_message = "TTL automatique (1) et cible *.pages.dev attendus."
  }
}

run "refuse_une_cible_hors_pages" {
  command = plan

  module {
    source = "./modules/dns-cname"
  }

  variables {
    target = "exemple.org"
  }

  expect_failures = [var.target]
}
