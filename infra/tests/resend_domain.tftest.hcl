# Module resend-domain avec un provider simulé (#209) : enregistrement DMARC écrit tel que déclaré,
# politique invalide refusée. La valeur choisie par la racine est vérifiée par scripts/infra-dmarc.test.mjs.
mock_provider "cloudflare" {}

variables {
  zone_id             = "zone-de-test"
  domain              = "example.dev"
  dkim_public_key     = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ"
  return_path_targets = { send = "send.example.net" }
  dmarc_policy        = "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@example.fr"
}

run "dmarc_ecrit_tel_quel" {
  command = plan

  module {
    source = "./modules/resend-domain"
  }

  assert {
    condition     = cloudflare_dns_record.dmarc.name == "_dmarc.example.dev" && cloudflare_dns_record.dmarc.content == "\"v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@example.fr\""
    error_message = "L'enregistrement _dmarc doit porter exactement la politique déclarée, entre guillemets."
  }
}

run "politique_invalide_refusee" {
  command = plan

  module {
    source = "./modules/resend-domain"
  }

  variables {
    dmarc_policy = "v=DMARC1; p=monitor"
  }

  expect_failures = [var.dmarc_policy]
}
