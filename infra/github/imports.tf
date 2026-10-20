# Tout l'existant est importé, jamais recréé : le premier plan ne montre que des imports.
# Identifiants relevés en lecture seule le 2026-10-20 (`gh api repos/PaulPerigault/portfolio/...`).
import {
  to = github_repository.portfolio
  id = "portfolio"
}

import {
  to = github_branch_default.develop
  id = "portfolio"
}

import {
  to = github_repository_vulnerability_alerts.portfolio
  id = "portfolio"
}

import {
  to = github_repository_dependabot_security_updates.portfolio
  id = "portfolio"
}

import {
  to = github_repository_ruleset.develop
  id = "portfolio:14958923"
}

import {
  to = github_repository_ruleset.main
  id = "portfolio:14958701"
}

import {
  for_each = toset(["develop", "main"])
  to       = github_branch_protection.branch[each.key]
  id       = "portfolio:${each.key}"
}

import {
  to = github_actions_variable.turnstile_sitekey
  id = "portfolio:PUBLIC_TURNSTILE_SITEKEY"
}

import {
  to = github_repository_environment.copilot
  id = "portfolio:copilot"
}

import {
  to = github_repository_environment.github_pages
  id = "portfolio:github-pages"
}
