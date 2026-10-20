# Jetons Cloudflare limités, chacun au strict nécessaire de son usage (infra/README.md, « Jetons »).
provider "cloudflare" {
  api_token = var.bootstrap_cloudflare_token
}

# Jetons de compte (BOOTSTRAP_CLOUDFLARE est un jeton de compte : l'API /user/tokens le refuse).
data "cloudflare_account_api_token_permission_groups_list" "all" {
  account_id = var.account_id
}

locals {
  account_resources = jsonencode({ "com.cloudflare.api.account.${var.account_id}" = "*" })
  # Toutes les zones du compte : la zone .fr est créée par infra/ après ce jeton.
  zone_resources = jsonencode({
    "com.cloudflare.api.account.${var.account_id}" = { "com.cloudflare.api.account.zone.*" = "*" }
  })

  # Noms des groupes de permissions de l'API (`GET /user/tokens/permission_groups`).
  tokens = {
    # infra/ en local : tout ce que ses modules créent ou modifient.
    terraform = {
      account = ["Turnstile Sites Write", "Workers Scripts Write", "Pages Write"]
      zone = [
        "Zone Write", "DNS Write", "Workers Routes Write", "Dynamic URL Redirects Write",
        "Zone WAF Write", "Zone Settings Write", "Bot Management Write", "Zone Transform Rules Read",
      ]
    }
    # CI : envoi de dist/ vers Pages, rien d'autre.
    pages_deploy = {
      account = ["Pages Write"]
      zone    = []
    }
    # CI : `tofu plan` de infra/ en lecture seule.
    ci_readonly = {
      account = ["Turnstile Sites Read", "Workers Scripts Read", "Pages Read"]
      zone = [
        "Zone Read", "DNS Read", "Workers Routes Read", "Dynamic URL Redirects Read",
        "Zone WAF Read", "Zone Settings Read", "Bot Management Read",
      ]
    }
  }

  # Un même nom peut exister en portée compte et en portée zone (« Logs Read »…) : chaque groupe est
  # choisi dans la portée de sa politique. Une entrée répétée (pagination) compte une seule fois.
  scopes = { account = "com.cloudflare.api.account", zone = "com.cloudflare.api.account.zone" }
  groups_by_scope = {
    for scope, urn in local.scopes : scope => {
      for group in data.cloudflare_account_api_token_permission_groups_list.all.result :
      group.name => group.id... if contains(group.scopes, urn)
    }
  }
  wanted = distinct(flatten([
    for token in local.tokens : [for scope in keys(local.scopes) : [for name in token[scope] : "${scope}/${name}"]]
  ]))
  group_ids = {
    for key in local.wanted : key => distinct(lookup(local.groups_by_scope[split("/", key)[0]], split("/", key)[1], []))
  }
  missing = [for key, ids in local.group_ids : key if length(ids) != 1]
}

resource "cloudflare_account_token" "limited" {
  for_each = local.tokens

  account_id = var.account_id

  name = "portfolio-${replace(each.key, "_", "-")}"
  policies = concat(
    [{
      effect            = "allow"
      permission_groups = [for name in each.value.account : { id = try(local.group_ids["account/${name}"][0], null) }]
      resources         = local.account_resources
    }],
    length(each.value.zone) == 0 ? [] : [{
      effect            = "allow"
      permission_groups = [for name in each.value.zone : { id = try(local.group_ids["zone/${name}"][0], null) }]
      resources         = local.zone_resources
    }],
  )
  expires_on = var.token_expires_on

  lifecycle {
    precondition {
      condition     = length(local.missing) == 0
      error_message = "Groupes de permissions absents ou ambigus chez Cloudflare : ${join(", ", local.missing)}."
    }
  }
}
