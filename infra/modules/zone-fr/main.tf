# Zone DNS du domaine canonique chez Cloudflare (ADR-0008). OVH reste le registrar : couper DNSSEC,
# changer les serveurs de noms et publier le DS s'y font à la main (docs/runbook-cloudflare.md §4).
# Tant que les serveurs de noms ne pointent pas ici, la zone est `pending` et ne répond à personne.
resource "cloudflare_zone" "fr" {
  account = {
    id = var.account_id
  }
  name = var.domain
  type = "full"
}

# Réglages qui casseraient le site ou ses garanties (docs/infra.md §3) : l'obfuscation des e-mails
# réécrit le `mailto:` avec un script que la CSP bloque ; Rocket Loader injecte un script tiers.
resource "cloudflare_zone_setting" "off" {
  for_each = toset(["email_obfuscation", "rocket_loader"])

  zone_id    = cloudflare_zone.fr.id
  setting_id = each.value
  value      = "off"
}

# Être connu des assistants IA est un objectif (docs/seo.md) : aucun blocage des robots d'IA, aucun
# labyrinthe, et le robots.txt généré par le site n'est pas réécrit par Cloudflare.
resource "cloudflare_bot_management" "fr" {
  zone_id               = cloudflare_zone.fr.id
  ai_bots_protection    = "disabled"
  crawler_protection    = "disabled"
  is_robots_txt_managed = false
}

# DNSSEC désactivé par défaut : il ne s'active qu'une fois les serveurs de noms Cloudflare en place
# et l'ancien DS d'OVH expiré (runbook §4.5), puis le DS en sortie se publie chez OVH (§4.6).
resource "cloudflare_zone_dnssec" "fr" {
  zone_id = cloudflare_zone.fr.id
  status  = var.dnssec_enabled ? "active" : "disabled"
}
