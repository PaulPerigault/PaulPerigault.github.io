<#
.SYNOPSIS
  Vérifie, en lecture seule, que le bucket R2 du state Terraform n'est joignable par aucun accès
  public : ni sous-domaine `r2.dev`, ni domaine personnalisé. Le state contient le secret Turnstile.
  N'affiche que des booléens et des noms de domaine ; code de sortie 1 si un accès public existe.

.EXAMPLE
  .\infra\r2-public-access.ps1
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/secrets.ps1')

$accountId = '5d7f707043c8dbe25d945c965f24880e'
$bucket = 'tfstate-portfolio'
$api = "https://api.cloudflare.com/client/v4/accounts/$accountId/r2/buckets/$bucket/domains"

$exitCode = 1
try {
  Import-Secrets -Path (Get-SecretsFilePath) -Names TF_VAR_cloudflare_api_token
  $headers = @{ Authorization = "Bearer $env:TF_VAR_cloudflare_api_token" }
  try {
    $managed = (Invoke-RestMethod -Uri "$api/managed" -Headers $headers).result
    $custom = @((Invoke-RestMethod -Uri "$api/custom" -Headers $headers).result.domains)
  }
  catch {
    throw 'Lecture refusée : le token doit avoir « Workers R2 Storage : Read » sur le compte. Sinon, faire le contrôle manuel décrit dans infra/README.md (« Accès au state »).'
  }
  Write-Output "Bucket $bucket"
  Write-Output "  sous-domaine r2.dev public : $([bool]$managed.enabled)"
  Write-Output "  domaines personnalisés     : $($custom.Count) $(($custom | ForEach-Object { $_.domain }) -join ', ')"
  $exitCode = if ($managed.enabled -or $custom.Count -gt 0) { 1 } else { 0 }
  Write-Output $(if ($exitCode -eq 0) { 'OK : aucun accès public.' } else { 'ALERTE : accès public au state.' })
}
finally {
  Clear-Secrets
}
exit $exitCode
