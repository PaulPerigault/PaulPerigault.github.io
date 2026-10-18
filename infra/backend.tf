# State dans le bucket R2 `tfstate-portfolio` (créé à la main, hors Terraform), via l'API S3 de R2.
# Le state contient des secrets (clé Turnstile, bindings du Worker) : il ne quitte jamais R2.
# Identifiants : AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY = clés S3 du bucket R2 (pas de compte AWS),
# chargées par `npm run infra:tf`. Pas de verrou de state : un seul opérateur, et aucun `apply` en CI.
terraform {
  backend "s3" {
    bucket = "tfstate-portfolio"
    key    = "portfolio/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://5d7f707043c8dbe25d945c965f24880e.r2.cloudflarestorage.com"
    }

    # R2 n'est pas AWS : pas de STS, pas de région AWS, pas de métadonnées EC2, pas de checksums S3.
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
