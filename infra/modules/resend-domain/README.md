# Module `resend-domain`

Enregistrements DNS qui permettent à Resend d'envoyer depuis `paulperigault.dev` : la clé **DKIM** (`resend._domainkey`, TXT) et le **chemin de retour** (`send` et `rsend`, CNAME vers `forge.rmta.net`, région UE).

Ils ont été créés à la main lors de la vérification du domaine chez Resend. Ils sont **importés** (`infra/imports.tf`), jamais recréés : leurs valeurs ici doivent rester exactement celles de Resend, sinon le domaine perd sa vérification.

Il gère aussi la politique **DMARC** (`_dmarc`, TXT) : aucun enregistrement n'existait dans la zone au moment de l'import (2026-10-13). Elle est **créée** par OpenTofu à partir de `dmarc_policy` (validée : `v=DMARC1;` et `p=none|quarantine|reject`), d'abord en observation (`p=none`), puis en quarantaine (`p=quarantine; pct=100`, #209), avant `p=reject` (voir `ROADMAP.md`). Testé par `infra/tests/resend_domain.tftest.hcl` (provider simulé) ; la valeur de la racine par `scripts/infra-dmarc.test.mjs`.

## Entrées

`zone_id`, `domain`, `dkim_public_key` (publique), `return_path_targets` (sous-domaine → cible CNAME), `dmarc_policy`.

## Supprimer ce service

Ne pas supprimer ces enregistrements tant que le Worker du formulaire envoie par Resend : retirer d'abord l'usage, puis le domaine chez Resend, puis le module.
