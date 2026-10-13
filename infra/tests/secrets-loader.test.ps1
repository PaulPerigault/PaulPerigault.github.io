# Tests du chargeur de secrets, sans Pester (pwsh suffit, aussi en CI) et sans jamais toucher au
# vrai fichier : chaque cas écrit un faux fichier dans un dossier temporaire.
#   pwsh infra/tests/secrets-loader.test.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../lib/secrets.ps1')

$failures = 0
function Assert([bool] $Condition, [string] $Message) {
  if ($Condition) { Write-Output "ok   $Message" } else { Write-Output "FAIL $Message"; $script:failures++ }
}
function Get-Error([scriptblock] $Action) { try { & $Action; '' } catch { $_.Exception.Message } }

$dir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
$fake = Join-Path $dir 'fake-secrets.txt'
$all = 'TF_VAR_cloudflare_api_token', 'TF_VAR_resend_api_key', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'

try {
  Set-Content -LiteralPath $fake -Value "# commentaire`n`nTF_VAR_cloudflare_api_token = fake-token`nAWS_ACCESS_KEY_ID=fake-id`nTF_VAR_resend_api_key=fake-resend"
  Import-Secrets -Path $fake -Names TF_VAR_cloudflare_api_token, AWS_ACCESS_KEY_ID
  Assert ($env:TF_VAR_cloudflare_api_token -eq 'fake-token') 'charge une valeur (espaces retirés, commentaires ignorés)'
  Assert ($env:AWS_ACCESS_KEY_ID -eq 'fake-id') 'charge plusieurs variables'
  Assert (-not $env:TF_VAR_resend_api_key) 'ne charge pas une variable connue mais non demandée'
  Clear-Secrets
  Assert (-not $env:TF_VAR_cloudflare_api_token -and -not $env:AWS_ACCESS_KEY_ID) 'Clear-Secrets retire toutes les variables'

  Set-Content -LiteralPath $fake -Value "AWS_ACCESS_KEY_ID=`"quoted id`"`nAWS_SECRET_ACCESS_KEY='single'"
  Import-Secrets -Path $fake -Names AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  Assert ($env:AWS_ACCESS_KEY_ID -eq 'quoted id' -and $env:AWS_SECRET_ACCESS_KEY -eq 'single') 'retire une paire de guillemets englobants'
  Clear-Secrets

  $message = Get-Error { Import-Secrets -Path $fake -Names $all }
  Assert ($message -like '*absente*TF_VAR_cloudflare_api_token*') 'signale une variable demandée absente'
  Clear-Secrets

  Set-Content -LiteralPath $fake -Value 'PATH=pirate'
  $message = Get-Error { Import-Secrets -Path $fake -Names $all }
  Assert ($message -like '*Variable inattendue*') 'refuse une variable inconnue (pas de PATH écrasé)'

  Set-Content -LiteralPath $fake -Value 'TF_VAR_resend_api_key sans-egal-valeur-secrete'
  $message = Get-Error { Import-Secrets -Path $fake -Names $all }
  Assert ($message -like '*illisible*' -and $message -notlike '*valeur-secrete*') 'erreur de format sans afficher la ligne'

  $message = Get-Error { Import-Secrets -Path (Join-Path $dir 'absent.txt') -Names $all }
  Assert ($message -like '*introuvable*') 'signale un fichier absent'

  $env:TF_SECRETS_FILE = $fake
  Assert ((Get-SecretsFilePath) -eq $fake) 'TF_SECRETS_FILE remplace le chemin par défaut'
  Remove-Item Env:TF_SECRETS_FILE
  Assert ((Get-SecretsFilePath) -like '*infra*.secrets.env') 'chemin par défaut : infra/.secrets.env'
}
finally {
  Clear-Secrets
  Remove-Item -LiteralPath $dir -Recurse -Force
}

if ($failures -gt 0) { exit 1 }
