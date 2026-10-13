# Chargement des secrets locaux (infra/.secrets.env, ignoré par Git) dans l'environnement du
# processus, le temps d'une commande. Aucune valeur n'est jamais affichée, même en cas d'erreur.
# Utilisé par tf.ps1 et dns-records.ps1 (dot-source). Testé par tests/secrets-loader.test.ps1.

$script:AllowedSecrets = @(
  'TF_VAR_cloudflare_api_token',
  'TF_VAR_resend_api_key',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
)

function Get-SecretsFilePath {
  # TF_SECRETS_FILE permet aux tests d'utiliser un faux fichier.
  if ($env:TF_SECRETS_FILE) { return $env:TF_SECRETS_FILE }
  return Join-Path (Split-Path $PSScriptRoot -Parent) '.secrets.env'
}

function Import-Secrets {
  param([Parameter(Mandatory)] [string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Fichier de secrets introuvable : $Path (voir infra/README.md)."
  }
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $Path) {
    $lineNumber++
    if ($line -match '^\s*(#|$)') { continue }
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
      throw "Ligne $lineNumber illisible dans le fichier de secrets (format attendu NOM=valeur)."
    }
    $name = $Matches[1]
    if ($script:AllowedSecrets -notcontains $name) {
      throw "Variable inattendue ligne $lineNumber : $name (attendues : $($script:AllowedSecrets -join ', '))."
    }
    [Environment]::SetEnvironmentVariable($name, $Matches[2].Trim(), 'Process')
  }
}

function Clear-Secrets {
  foreach ($name in $script:AllowedSecrets) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
}
