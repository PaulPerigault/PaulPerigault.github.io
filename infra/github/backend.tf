# State propre à la brique, dans le même bucket R2 que infra/ (clé distincte). Aucun secret :
# réglages publics du dépôt, rulesets, variable publique, environnements.
terraform {
  backend "s3" {
    bucket = "tfstate-portfolio"
    key    = "github/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://5d7f707043c8dbe25d945c965f24880e.r2.cloudflarestorage.com"
    }

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
