<#
.SYNOPSIS
  Lance Terraform dans infra/ avec les secrets de infra/.secrets.env, le temps de la commande,
  puis retire les variables de l'environnement (même en cas d'erreur).

.EXAMPLE
  .\infra\tf.ps1 init
  .\infra\tf.ps1 plan
  .\infra\tf.ps1 output contact_form_turnstile_sitekey

.NOTES
  Les arguments sont transmis tels quels à Terraform. Aucune valeur de secret n'est affichée.
  `apply` et `destroy` ne sont lancés que par le propriétaire, jamais par la CI ni par l'assistant.
#>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/secrets.ps1')

$exitCode = 1
try {
  Import-Secrets -Path (Get-SecretsFilePath)
  & terraform "-chdir=$PSScriptRoot" @args
  $exitCode = $LASTEXITCODE
}
finally {
  Clear-Secrets
}
exit $exitCode
