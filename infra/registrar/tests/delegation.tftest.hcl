# Module delegation avec un provider simulé : aucun appel à OVH (`tofu test`).
mock_provider "ovh" {}

variables {
  domain = "paulperigault.fr"
}

run "etat_actuel_ovh_sans_ds" {
  command = plan

  module {
    source = "./modules/delegation"
  }

  variables {
    name_servers = ["dns14.ovh.net", "ns14.ovh.net"]
  }

  assert {
    condition     = [for server in ovh_domain_name_servers.fr.servers : server.host] == ["dns14.ovh.net", "ns14.ovh.net"]
    error_message = "Serveurs de noms d'OVH, dans l'ordre donné."
  }

  assert {
    condition     = length(ovh_domain_ds_records.fr) == 0
    error_message = "Aucun DS tant que la liste est vide."
  }
}

run "ds_cloudflare_apres_bascule" {
  command = plan

  module {
    source = "./modules/delegation"
  }

  variables {
    name_servers = ["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"]
    ds_records   = [{ key_tag = 2371, public_key = "bWFkZS11cA==" }]
  }

  assert {
    condition     = ovh_domain_ds_records.fr[0].ds_records[0].algorithm == "ECDSAP256SHA256" && ovh_domain_ds_records.fr[0].ds_records[0].flags == "KEY_SIGNING_KEY" && ovh_domain_ds_records.fr[0].ds_records[0].tag == 2371
    error_message = "DS de la KSK de Cloudflare, algorithme 13."
  }
}

run "ds_refuse_sans_serveurs_cloudflare" {
  command = plan

  module {
    source = "./modules/delegation"
  }

  variables {
    name_servers = ["dns14.ovh.net", "ns14.ovh.net"]
    ds_records   = [{ key_tag = 2371, public_key = "bWFkZS11cA==" }]
  }

  expect_failures = [ovh_domain_ds_records.fr]
}

run "un_seul_serveur_refuse" {
  command = plan

  module {
    source = "./modules/delegation"
  }

  variables {
    name_servers = ["ada.ns.cloudflare.com"]
  }

  expect_failures = [var.name_servers]
}
