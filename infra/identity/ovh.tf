# Comptes de service OAuth2 d'OVH pour infra/registrar/ et politiques IAM au plus juste : le seul
# domaine, et les seules actions du provider OVH (resource_domain_name_servers.go,
# resource_domain_ds_records.go). Aucun droit sur le transfert, authInfo, le titulaire, les contacts.
provider "ovh" {
  endpoint           = "ovh-eu"
  application_key    = var.bootstrap_ovh_application_key
  application_secret = var.bootstrap_ovh_application_secret
  consumer_key       = var.bootstrap_ovh_consumer_key
}

locals {
  domain_urn = "urn:v1:eu:resource:domain:${var.domain}"
  read_actions = [
    "domain:apiovh:nameServer/get",
    "domain:apiovh:dsRecord/get",
  ]
  write_actions = concat(local.read_actions, [
    "domain:apiovh:nameServer/edit",
    "domain:apiovh:dsRecord/create",
    "domain:apiovh:task/get",
  ])
}

resource "ovh_me_api_oauth2_client" "registrar" {
  for_each = toset(["write", "read"])

  name        = "portfolio-registrar-${each.key}"
  description = each.key == "write" ? "infra/registrar en local (apply)" : "infra/registrar en CI (plan planifié)"
  flow        = "CLIENT_CREDENTIALS"
}

# Écriture : depuis l'adresse du propriétaire seulement.
resource "ovh_iam_policy" "registrar_write" {
  name        = "portfolio-registrar-write"
  description = "Serveurs de noms et DS de ${var.domain}, depuis l'IP du propriétaire"
  identities  = [ovh_me_api_oauth2_client.registrar["write"].identity]
  resources   = [local.domain_urn]
  allow       = local.write_actions

  conditions {
    operator = "MATCH"
    values = {
      "request.IP" = var.owner_ip
    }
  }
}

resource "ovh_iam_policy" "registrar_read" {
  name        = "portfolio-registrar-read"
  description = "Lecture des serveurs de noms et du DS de ${var.domain} (CI)"
  identities  = [ovh_me_api_oauth2_client.registrar["read"].identity]
  resources   = [local.domain_urn]
  allow       = local.read_actions
}
