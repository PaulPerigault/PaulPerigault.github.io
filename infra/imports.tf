# Enregistrements DNS existants (créés à la main pour Resend), importés et non recréés.
# Identifiants relevés le 2026-10-13 avec le relevé DNS en lecture seule (aujourd'hui `npm run infra:dns`).
# Format d'import du provider v5 : "<zone_id>/<dns_record_id>".
# Une fois l'import appliqué, ces blocs peuvent rester : ils deviennent sans effet.

import {
  to = module.resend_domain.cloudflare_dns_record.dkim
  id = "27e7dafe4692cad095af23ff0224f65a/c7650c8a85bc3f1bbe4c92c0b4902ca2"
}

import {
  to = module.resend_domain.cloudflare_dns_record.return_path["send"]
  id = "27e7dafe4692cad095af23ff0224f65a/b206b283d471b341b4a37b7bb7711562"
}

import {
  to = module.resend_domain.cloudflare_dns_record.return_path["rsend"]
  id = "27e7dafe4692cad095af23ff0224f65a/bb7be28bf1ee811c6a39f007a7e14328"
}

# Redirection `.dev` → `.fr`, créée à la main dans le tableau de bord (Rules → Redirect Rules) : un
# seul ruleset `http_request_dynamic_redirect` par zone, donc importé, jamais recréé. Format :
# "zones/<zone_id>/<ruleset_id>". Identifiant à relever, en lecture seule, par
# `npm run infra:rulesets` (ligne `import` sous `phase : http_request_dynamic_redirect`), puis à
# reporter ici avant le premier `plan` : tant qu'il manque, le plan échoue sur cet import.
import {
  to = module.dev_redirect.cloudflare_ruleset.redirect
  id = "zones/27e7dafe4692cad095af23ff0224f65a/RULESET_ID_A_RELEVER"
}

# Limitation de débit du formulaire : #181 la prévoyait à la main ; si `npm run infra:rulesets`
# montre déjà un ruleset `http_ratelimit` sur paulperigault.dev, décommenter ce bloc avec son
# identifiant (sinon OpenTofu le crée et ce bloc reste commenté).
# import {
#   to = module.contact_form.cloudflare_ruleset.rate_limit
#   id = "zones/27e7dafe4692cad095af23ff0224f65a/<ruleset_id>"
# }
