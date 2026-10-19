# State propre à la brique (aucun secret : serveurs de noms et DS sont publics), même bucket R2.
terraform {
  backend "s3" {
    bucket = "tfstate-portfolio"
    key    = "registrar/terraform.tfstate"
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
