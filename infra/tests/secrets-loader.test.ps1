# Tests du chargeur de secrets, sans Pester (pwsh suffit, aussi en CI) et sans jamais toucher au
# vrai fichier : chaque cas écrit un faux fichier dans un dossier temporaire.
#   pwsh infra/tests/secrets-loader.test.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../lib/secrets.ps1')

$failures = 0
function Assert([bool] $Condition, [string] $Message) {
  if ($Condition) { Write-Output "ok   $Message" } else { Write-Output "FAIL $Message"; $script:failures++ }
}

$dir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
$fake = Join-Path $dir 'fake-secrets.txt'

try {
  Set-Content -LiteralPath $fake -Value "# commentaire`n`nTF_VAR_cloudflare_api_token = fake-token`nAWS_ACCESS_KEY_ID=fake-id"
  Import-Secrets -Path $fake
  Assert ($env:TF_VAR_cloudflare_api_token -eq 'fake-token') 'charge une valeur (espaces retirés, commentaires ignorés)'
  Assert ($env:AWS_ACCESS_KEY_ID -eq 'fake-id') 'charge plusieurs variables'
  Clear-Secrets
  Assert (-not $env:TF_VAR_cloudflare_api_token -and -not $env:AWS_ACCESS_KEY_ID) 'Clear-Secrets retire toutes les variables'

  Set-Content -LiteralPath $fake -Value 'PATH=pirate'
  $message = try { Import-Secrets -Path $fake; '' } catch { $_.Exception.Message }
  Assert ($message -like '*Variable inattendue*') 'refuse une variable hors liste (pas de PATH écrasé)'

  Set-Content -LiteralPath $fake -Value 'TF_VAR_resend_api_key sans-egal-valeur-secrete'
  $message = try { Import-Secrets -Path $fake; '' } catch { $_.Exception.Message }
  Assert ($message -like '*illisible*' -and $message -notlike '*valeur-secrete*') 'erreur de format sans afficher la ligne'

  $message = try { Import-Secrets -Path (Join-Path $dir 'absent.txt'); '' } catch { $_.Exception.Message }
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
