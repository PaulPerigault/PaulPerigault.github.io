# Module pages-site avec un provider simulé : aucun appel à Cloudflare, aucun secret (`tofu test`).
mock_provider "cloudflare" {}

variables {
  account_id = "compte-de-test"
}

run "sans_domaine_par_defaut" {
  command = plan

  module {
    source = "./modules/pages-site"
  }

  assert {
    condition     = length(cloudflare_pages_domain.site) == 0
    error_message = "Aucun domaine ne doit être déclaré avant la bascule DNS."
  }

  assert {
    condition     = cloudflare_pages_project.site.production_branch == "main" && cloudflare_pages_project.site.name == "paulperigault"
    error_message = "Projet attendu : paulperigault, branche de production main."
  }

  assert {
    condition     = cloudflare_pages_project.site.source == null
    error_message = "Le projet ne doit pas être relié à Git : la CI envoie l'artefact testé."
  }
}

run "un_domaine_par_entree" {
  command = plan

  module {
    source = "./modules/pages-site"
  }

  variables {
    custom_domains = ["paulperigault.fr", "www.paulperigault.fr"]
  }

  assert {
    condition     = toset(keys(cloudflare_pages_domain.site)) == toset(["paulperigault.fr", "www.paulperigault.fr"])
    error_message = "Un cloudflare_pages_domain par domaine personnalisé."
  }
}
