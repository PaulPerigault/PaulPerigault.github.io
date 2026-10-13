<#
.SYNOPSIS
  Liste, en lecture seule, les enregistrements DNS de la zone paulperigault.dev : identifiants et
  contenus nécessaires aux blocs `import {}` (Resend, DMARC). N'affiche aucun secret.

.EXAMPLE
  .\infra\dns-records.ps1
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/secrets.ps1')

$zoneName = 'paulperigault.dev'
$api = 'https://api.cloudflare.com/client/v4'

try {
  Import-Secrets -Path (Get-SecretsFilePath) -Names TF_VAR_cloudflare_api_token
  $headers = @{ Authorization = "Bearer $env:TF_VAR_cloudflare_api_token" }
  $zone = (Invoke-RestMethod -Uri "$api/zones?name=$zoneName" -Headers $headers).result | Select-Object -First 1
  if (-not $zone) { throw "Zone $zoneName introuvable pour ce token." }
  Write-Output "zone_id = $($zone.id)"
  (Invoke-RestMethod -Uri "$api/zones/$($zone.id)/dns_records?per_page=100" -Headers $headers).result |
    Select-Object id, type, name, content, ttl, proxied, priority, comment |
    Format-List
}
finally {
  Clear-Secrets
}
