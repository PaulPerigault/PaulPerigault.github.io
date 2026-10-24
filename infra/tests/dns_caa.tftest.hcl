# Module dns-caa avec un provider simulé : aucun appel à Cloudflare, aucun secret (`tofu test`).
mock_provider "cloudflare" {}

variables {
  zone_id = "zone-de-test"
  domain  = "example.dev"
}

run "autorites_cloudflare_par_defaut" {
  command = plan

  module {
    source = "./modules/dns-caa"
  }

  assert {
    condition     = length(cloudflare_dns_record.caa) == 8 && alltrue([for record in cloudflare_dns_record.caa : record.type == "CAA" && record.name == "example.dev" && record.proxied == false && record.data.flags == 0])
    error_message = "Huit CAA en DNS seul à l'apex : issue et issuewild pour quatre autorités."
  }

  assert {
    condition     = toset([for record in cloudflare_dns_record.caa : record.data.value if record.data.tag == "issue"]) == toset(["letsencrypt.org", "pki.goog; cansignhttpexchanges=yes", "ssl.com", "sectigo.com"])
    error_message = "Let's Encrypt, Google Trust Services, SSL.com et Sectigo doivent être admis (autorités de Cloudflare)."
  }

  assert {
    condition     = toset([for record in cloudflare_dns_record.caa : record.data.value if record.data.tag == "issuewild"]) == toset([for record in cloudflare_dns_record.caa : record.data.value if record.data.tag == "issue"])
    error_message = "issuewild doit admettre les mêmes autorités que issue."
  }
}

run "une_seule_autorite" {
  command = plan

  module {
    source = "./modules/dns-caa"
  }

  variables {
    authorities = ["letsencrypt.org"]
  }

  assert {
    condition     = toset(keys(cloudflare_dns_record.caa)) == toset(["issue-letsencrypt.org", "issuewild-letsencrypt.org"])
    error_message = "Une autorité donne un issue et un issuewild."
  }
}

run "refuse_une_liste_vide" {
  command = plan

  module {
    source = "./modules/dns-caa"
  }

  variables {
    authorities = []
  }

  expect_failures = [var.authorities]
}

run "refuse_une_autorite_mal_formee" {
  command = plan

  module {
    source = "./modules/dns-caa"
  }

  variables {
    authorities = ["https://letsencrypt.org/"]
  }

  expect_failures = [var.authorities]
}
