# Délégation de paulperigault.fr. Les valeurs sont publiques (DNS) et changent par PR, une étape à
# la fois (docs/runbook-cloudflare.md §4) : serveurs de noms d'abord, DS ensuite.
module "delegation" {
  source = "./modules/delegation"

  domain       = "paulperigault.fr"
  name_servers = ["dns14.ovh.net", "ns14.ovh.net"]
  ds_records   = []
}
