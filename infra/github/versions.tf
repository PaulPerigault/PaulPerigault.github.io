# Brique « github » : réglages du dépôt PaulPerigault/portfolio (ADR-0010). Authentifiée par le jeton
# fine-grained GITHUB_IAC_TOKEN (dépôt seul), passé au provider sous GITHUB_TOKEN par
# npm run infra:github.
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.13.0"
    }
  }
}

provider "github" {
  owner = "PaulPerigault"
}
