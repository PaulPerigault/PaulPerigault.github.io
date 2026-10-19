# Module zone-fr avec un provider simulé : aucun appel à Cloudflare, aucun secret (`tofu test`).
mock_provider "cloudflare" {}

variables {
  account_id = "compte-de-test"
}

run "zone_avant_bascule" {
  command = plan

  module {
    source = "./modules/zone-fr"
  }

  assert {
    condition     = cloudflare_zone.fr.name == "paulperigault.fr" && cloudflare_zone.fr.type == "full"
    error_message = "Zone complète paulperigault.fr attendue."
  }

  assert {
    condition     = cloudflare_zone_dnssec.fr.status == "disabled" && output.dnssec_ds == null
    error_message = "DNSSEC désactivé par défaut, sans DS à publier."
  }

  assert {
    condition     = alltrue([for record in concat(values(cloudflare_dns_record.mx), values(cloudflare_dns_record.txt), [cloudflare_dns_record.dkim], values(cloudflare_dns_record.github_pages)) : record.proxied == false])
    error_message = "Avant la bascule, tous les enregistrements sont en DNS seul."
  }

  assert {
    condition     = toset([for record in cloudflare_dns_record.mx : record.content]) == toset(["mx01.mail.icloud.com", "mx02.mail.icloud.com"]) && alltrue([for record in cloudflare_dns_record.mx : record.priority == 10])
    error_message = "MX iCloud mx01 et mx02, priorité 10."
  }

  assert {
    condition     = cloudflare_dns_record.txt["google"].content == "\"google-site-verification=cxQAcHWF8Rlb3k7ylL2GCZe3wRkX-3cEqoYpLXtfk5c\""
    error_message = "TXT Google : le jeton une seule fois."
  }

  assert {
    condition     = cloudflare_dns_record.txt["spf"].content == "\"v=spf1 include:icloud.com ~all\"" && cloudflare_dns_record.txt["apple"].content == "\"apple-domain=2bd6D1utf4PWjrR4\""
    error_message = "SPF et apple-domain recopiés de la zone OVH."
  }

  assert {
    condition     = cloudflare_dns_record.txt["dmarc_report"].name == "paulperigault.dev._report._dmarc.paulperigault.fr" && cloudflare_dns_record.txt["dmarc_report"].content == "\"v=DMARC1\""
    error_message = "Autorisation des rapports DMARC du .dev."
  }

  assert {
    condition     = cloudflare_dns_record.dkim.name == "sig1._domainkey.paulperigault.fr" && cloudflare_dns_record.dkim.content == "sig1.dkim.paulperigault.fr.at.icloudmailadmin.com"
    error_message = "DKIM iCloud en CNAME."
  }

  assert {
    condition     = length([for record in cloudflare_dns_record.github_pages : record if record.type == "A"]) == 4 && cloudflare_dns_record.github_pages["www"].content == "paulperigault.github.io" && length(cloudflare_dns_record.pages) == 0
    error_message = "Site encore sur GitHub Pages : 4 A à l'apex, www vers github.io, aucun CNAME Pages."
  }

  assert {
    condition     = alltrue([for setting in cloudflare_zone_setting.off : setting.value == "off"]) && toset(keys(cloudflare_zone_setting.off)) == toset(["email_obfuscation", "rocket_loader"])
    error_message = "Obfuscation des e-mails et Rocket Loader désactivés."
  }

  assert {
    condition     = cloudflare_bot_management.fr.ai_bots_protection == "disabled" && cloudflare_bot_management.fr.is_robots_txt_managed == false && cloudflare_bot_management.fr.crawler_protection == "disabled"
    error_message = "Aucun blocage des robots d'IA, robots.txt non réécrit."
  }
}

run "dnssec_actif" {
  command = plan

  module {
    source = "./modules/zone-fr"
  }

  variables {
    dnssec_enabled = true
  }

  assert {
    condition     = cloudflare_zone_dnssec.fr.status == "active"
    error_message = "DNSSEC actif quand dnssec_enabled vaut true."
  }
}

run "site_sur_cloudflare_pages" {
  command = plan

  module {
    source = "./modules/zone-fr"
  }

  variables {
    pages_target = "paulperigault.pages.dev"
  }

  assert {
    condition     = length(cloudflare_dns_record.github_pages) == 0
    error_message = "Plus aucun enregistrement GitHub Pages."
  }

  assert {
    condition     = toset(keys(cloudflare_dns_record.pages)) == toset(["paulperigault.fr", "www.paulperigault.fr"]) && alltrue([for record in cloudflare_dns_record.pages : record.proxied && record.type == "CNAME" && record.content == "paulperigault.pages.dev"])
    error_message = "CNAME @ et www proxifiés vers le projet Pages."
  }

  assert {
    condition     = length(cloudflare_dns_record.mx) == 2 && length(cloudflare_dns_record.txt) == 4
    error_message = "La messagerie et les vérifications ne bougent pas."
  }
}

run "cible_pages_invalide" {
  command = plan

  module {
    source = "./modules/zone-fr"
  }

  variables {
    pages_target = "https://paulperigault.pages.dev/"
  }

  expect_failures = [var.pages_target]
}

run "jeton_google_double_refuse" {
  command = plan

  module {
    source = "./modules/zone-fr"
  }

  variables {
    google_site_verification = "abcgoogle-site-verification=abc"
  }

  expect_failures = [var.google_site_verification]
}
