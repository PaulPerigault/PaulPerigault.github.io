# Clé d'API de PageSpeed Insights et de CrUX, restreinte à ces deux API : volée, elle ne sert à rien
# d'autre (elle n'ouvre ni Search Console ni aucune ressource). Sa valeur reste dans ce state et
# part dans le secret GitHub GOOGLE_API_KEY, posé par infra/identity.
resource "google_apikeys_key" "psi_crux" {
  project      = google_project.observability.project_id
  name         = "web-presence-psi-crux"
  display_name = "web-presence : PageSpeed Insights et CrUX"

  restrictions {
    api_targets {
      service = "pagespeedonline.googleapis.com"
    }
    api_targets {
      service = "chromeuxreport.googleapis.com"
    }
  }

  depends_on = [google_project_service.enabled]
}
