# Chargement des secrets locaux (infra/.secrets.env, ignoré par Git) dans l'environnement du
# processus, le temps d'une commande. Aucune valeur n'est jamais affichée, même en cas d'erreur.
# Utilisé par tf.ps1, dns-records.ps1 et contact-form-secrets.ps1 (dot-source).
# Testé par tests/secrets-loader.test.ps1.

# Variables que le fichier peut contenir ; toute autre ligne est refusée (fichier corrompu ou erreur).
$script:KnownSecrets = @(
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

# Convention des fichiers .env : espaces autour ignorés, une paire de guillemets englobants retirée.
function ConvertFrom-EnvValue([string] $Raw) {
  $value = $Raw.Trim()
  if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") { return $Matches[1] }
  return $value
}

# Charge seulement les variables `Names` dont le helper a besoin ; les autres variables connues du
# fichier sont ignorées, une variable inconnue fait échouer, une variable demandée absente aussi.
function Import-Secrets {
  param([Parameter(Mandatory)] [string] $Path, [Parameter(Mandatory)] [string[]] $Names)
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
    if ($script:KnownSecrets -notcontains $name) {
      throw "Variable inattendue ligne $lineNumber : $name (connues : $($script:KnownSecrets -join ', '))."
    }
    if ($Names -contains $name) {
      [Environment]::SetEnvironmentVariable($name, (ConvertFrom-EnvValue $Matches[2]), 'Process')
    }
  }
  $missing = $Names | Where-Object { -not [Environment]::GetEnvironmentVariable($_, 'Process') }
  if ($missing) { throw "Variable absente du fichier de secrets : $($missing -join ', ')." }
}

function Clear-Secrets {
  foreach ($name in $script:KnownSecrets) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
}
