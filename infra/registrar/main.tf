# Délégation de paulperigault.fr. Les valeurs sont publiques (DNS) et changent par PR, une étape à
# la fois (docs/runbook-cloudflare.md §4) : serveurs de noms d'abord, DS ensuite.
module "delegation" {
  source = "./modules/delegation"

  domain       = "paulperigault.fr"
  name_servers = ["arushi.ns.cloudflare.com", "yew.ns.cloudflare.com"]
  # Sortie fr_dnssec_ds de infra/ (2026-10-20) : KSK de Cloudflare, algorithme 13.
  ds_records = [{
    key_tag    = 2371
    public_key = "mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopKl+GqJxpVXckHAeF+KkxLbxILfDLUT0rAK9iUzy1L53eKGQ=="
  }]
}
