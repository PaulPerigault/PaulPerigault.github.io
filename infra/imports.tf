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
