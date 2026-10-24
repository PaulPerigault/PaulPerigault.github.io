# State propre à la brique, dans le même bucket R2 que infra/ (clé distincte). Il contient la clé
# d'API PageSpeed/CrUX : il ne quitte jamais R2 (infra/README.md, « State »). Identifiants : clés S3
# du bucket, chargées par npm run infra:google. Authentification Google : identifiants applicatifs
# par défaut du propriétaire (`gcloud auth application-default login`), jamais une clé de fichier.
terraform {
  backend "s3" {
    bucket = "tfstate-portfolio"
    key    = "google-observability/terraform.tfstate"
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
