# Projet dédié et API activées. PageSpeed Insights et CrUX répondent à une clé d'API ; Search
# Console répond à un jeton OAuth de compte de service. Les autres API servent à la fédération.
locals {
  apis = toset([
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "apikeys.googleapis.com",
    "searchconsole.googleapis.com",
    "pagespeedonline.googleapis.com",
    "chromeuxreport.googleapis.com",
  ])
}

resource "google_project" "observability" {
  name                = "Portfolio observability"
  project_id          = var.project_id
  org_id              = var.org_id
  billing_account     = var.billing_account
  auto_create_network = false
  # Le projet porte la clé d'API et la fédération : jamais supprimé par un apply.
  deletion_policy = "PREVENT"

  labels = {
    usage = "web-presence"
  }
}

resource "google_project_service" "enabled" {
  for_each = local.apis

  project = google_project.observability.project_id
  service = each.key
  # Désactiver une API à la destruction casserait d'autres usages éventuels du projet.
  disable_on_destroy         = false
  disable_dependent_services = false
}
