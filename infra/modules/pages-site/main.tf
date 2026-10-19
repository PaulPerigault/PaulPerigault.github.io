# Hébergement du site statique sur Cloudflare Pages (ADR-0008), **sans source Git** : la CI envoie
# l'artefact déjà construit et testé (`dist/`, envoi direct), comme pour GitHub Pages aujourd'hui.
# Les en-têtes de sécurité viennent de `public/_headers`, publié avec le site.
resource "cloudflare_pages_project" "site" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = var.production_branch
}

# Un domaine personnalisé ne s'active qu'avec l'enregistrement DNS qui le vise (géré hors de ce
# module : le domaine canonique est chez OVH). Liste vide = aucun domaine.
resource "cloudflare_pages_domain" "site" {
  for_each = toset(var.custom_domains)

  account_id   = var.account_id
  project_name = cloudflare_pages_project.site.name
  name         = each.value
}
