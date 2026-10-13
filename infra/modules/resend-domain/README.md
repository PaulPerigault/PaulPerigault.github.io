# Module `resend-domain`

Enregistrements DNS qui permettent à Resend d'envoyer depuis `paulperigault.dev` : la clé **DKIM** (`resend._domainkey`, TXT) et le **chemin de retour** (`send` et `rsend`, CNAME vers `forge.rmta.net`, région UE).

Ils ont été créés à la main lors de la vérification du domaine chez Resend. Ils sont **importés** (`infra/imports.tf`), jamais recréés : leurs valeurs ici doivent rester exactement celles de Resend, sinon le domaine perd sa vérification.

Aucun enregistrement **DMARC** (`_dmarc`) n'existait dans la zone au moment de l'import (2026-10-13) : voir `ROADMAP.md`.

## Entrées

`zone_id`, `domain`, `dkim_public_key` (publique), `return_path_targets` (sous-domaine → cible CNAME).

## Supprimer ce service

Ne pas supprimer ces enregistrements tant que le Worker du formulaire envoie par Resend : retirer d'abord l'usage, puis le domaine chez Resend, puis le module.
