# Redirection permanente d'hôtes secondaires vers l'origine canonique, chemin et paramètres conservés.
# Une zone n'a qu'un ruleset par phase : ce module possède la phase de redirection de sa zone.
locals {
  hosts = join(" ", [for host in var.hosts : "\"${host}\""])
}

resource "cloudflare_ruleset" "redirect" {
  zone_id     = var.zone_id
  name        = "default"
  description = "Redirections vers ${var.target_origin} (OpenTofu)"
  kind        = "zone"
  phase       = "http_request_dynamic_redirect"

  rules = [{
    ref         = "canonical"
    description = "Vers ${var.target_origin}"
    expression  = "http.host in {${local.hosts}}"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"${var.target_origin}\", http.request.uri.path)"
        }
      }
    }
  }]
}
