# Compte de service en lecture seule. Aucune clé n'est créée (pas de `google_service_account_key`,
# vérifié par scripts/infra-google-observability.test.mjs) : il n'est joignable que par la
# fédération d'identité de wif.tf. Son seul rôle de projet permet d'appeler les API activées ; il
# ne lit ni n'écrit aucune ressource Google Cloud. Les données de Search Console, elles, ne
# s'obtiennent qu'après l'ajout manuel de son e-mail à la propriété (docs/manual-steps.md), et le
# jeton demandé par le workflow ne porte que la portée `webmasters.readonly`.
resource "google_service_account" "web_presence" {
  project      = google_project.observability.project_id
  account_id   = "web-presence"
  display_name = "Contrôle de présence en ligne (lecture seule)"
  description  = "Utilisé uniquement par le workflow web-presence, par fédération d'identité."

  depends_on = [google_project_service.enabled]
}

resource "google_project_iam_member" "consume_apis" {
  project = google_project.observability.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.web_presence.email}"
}
