<#
.SYNOPSIS
  Pose les secrets du Worker du formulaire (RESEND_API_KEY, TURNSTILE_SECRET) avec
  `wrangler secret bulk`, sans jamais afficher une valeur ni l'écrire dans un fichier.

.DESCRIPTION
  - RESEND_API_KEY vient de infra/.secrets.env (TF_VAR_resend_api_key) ;
  - TURNSTILE_SECRET vient de `terraform output -raw` (sortie sensible, capturée en mémoire) ;
  - les deux partent ensemble, en JSON, sur l'entrée standard de Wrangler (pas d'argument de
    ligne de commande visible dans la liste des processus, pas de fichier, pas de retour à la ligne
    parasite) ; Wrangler s'authentifie avec le token Cloudflare (CLOUDFLARE_API_TOKEN, le temps
    de la commande).
  À lancer après le premier `wrangler deploy`, puis à chaque rotation de la clé Resend ou du widget.

.EXAMPLE
  .\infra\contact-form-secrets.ps1
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/secrets.ps1')

$workerDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'worker'
$exitCode = 1
try {
  Import-Secrets -Path (Get-SecretsFilePath) -Names TF_VAR_cloudflare_api_token, TF_VAR_resend_api_key, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  $turnstileSecret = & terraform "-chdir=$PSScriptRoot" output -raw contact_form_turnstile_secret
  if ($LASTEXITCODE -ne 0 -or -not $turnstileSecret) {
    throw 'Secret Turnstile indisponible : lancer d''abord `.\infra\tf.ps1 apply` (propriétaire).'
  }
  $env:CLOUDFLARE_API_TOKEN = $env:TF_VAR_cloudflare_api_token
  $payload = @{ RESEND_API_KEY = $env:TF_VAR_resend_api_key; TURNSTILE_SECRET = "$turnstileSecret" } |
    ConvertTo-Json -Compress
  $payload | & npx --prefix $workerDir wrangler secret bulk --config (Join-Path $workerDir 'wrangler.toml')
  $exitCode = $LASTEXITCODE
}
finally {
  Remove-Variable -Name turnstileSecret, payload -ErrorAction SilentlyContinue
  Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  Clear-Secrets
}
exit $exitCode
