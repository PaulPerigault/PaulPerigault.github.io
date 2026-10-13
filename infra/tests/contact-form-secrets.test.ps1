# Test de contact-form-secrets.ps1 avec des doublures de `terraform` et `npx` placées en tête du
# PATH : aucun appel réel, aucun vrai secret. Vérifie que les valeurs partent par l'entrée standard
# de Wrangler, jamais sur la console, et que l'environnement est nettoyé après coup.
#   pwsh infra/tests/contact-form-secrets.test.ps1
$ErrorActionPreference = 'Stop'

$failures = 0
function Assert([bool] $Condition, [string] $Message) {
  if ($Condition) { Write-Output "ok   $Message" } else { Write-Output "FAIL $Message"; $script:failures++ }
}

$dir = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
$stdinCapture = Join-Path $dir 'stdin.json'
$fake = Join-Path $dir 'fake-secrets.txt'
Set-Content -LiteralPath $fake -Value "TF_VAR_cloudflare_api_token=fake-cf`nTF_VAR_resend_api_key=fake-resend`nAWS_ACCESS_KEY_ID=fake-id`nAWS_SECRET_ACCESS_KEY=fake-key"

# Doublures : terraform renvoie un faux secret ; npx recopie son entrée standard dans un fichier.
$tfStub = "Write-Output 'fake-turnstile'"
$npxStub = "`$input | Out-File -LiteralPath '$stdinCapture' -Encoding utf8; Write-Output 'stub wrangler ok'"
foreach ($stub in @{ terraform = $tfStub; npx = $npxStub }.GetEnumerator()) {
  $ps1 = Join-Path $dir "$($stub.Key)-stub.ps1"
  Set-Content -LiteralPath $ps1 -Value $stub.Value
  if ($IsWindows) {
    Set-Content -LiteralPath (Join-Path $dir "$($stub.Key).cmd") -Value "@pwsh -NoProfile -File `"$ps1`" %*"
  }
  else {
    $sh = Join-Path $dir $stub.Key
    Set-Content -LiteralPath $sh -Value "#!/bin/sh`nexec pwsh -NoProfile -File '$ps1' `"`$@`""
    chmod +x $sh
  }
}

$savedPath = $env:PATH
try {
  $env:PATH = "$dir$([IO.Path]::PathSeparator)$savedPath"
  $env:TF_SECRETS_FILE = $fake
  $console = & (Join-Path $PSScriptRoot '../contact-form-secrets.ps1') 2>&1 | Out-String
  Assert ($LASTEXITCODE -eq 0) 'se termine sans erreur'
  $sent = Get-Content -LiteralPath $stdinCapture -Raw | ConvertFrom-Json
  Assert ($sent.RESEND_API_KEY -eq 'fake-resend') 'RESEND_API_KEY part par stdin, depuis le fichier de secrets'
  Assert ($sent.TURNSTILE_SECRET -eq 'fake-turnstile') 'TURNSTILE_SECRET part par stdin, depuis terraform output'
  Assert ($console -notmatch 'fake-resend|fake-turnstile|fake-cf') 'aucune valeur sur la console'
  Assert (-not $env:CLOUDFLARE_API_TOKEN -and -not $env:TF_VAR_resend_api_key) 'environnement nettoyé'
}
finally {
  $env:PATH = $savedPath
  Remove-Item Env:TF_SECRETS_FILE -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $dir -Recurse -Force
}

if ($failures -gt 0) { exit 1 }
