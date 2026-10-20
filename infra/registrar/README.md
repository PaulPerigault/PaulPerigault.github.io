# Brique `registrar`

Délégation de `paulperigault.fr` chez OVH, le registrar : **serveurs de noms** et **DS**. Rien d'autre (ni contacts, ni titulaire, ni transfert, ni `authInfo`) : le compte de service OAuth2 qui l'authentifie n'a, par sa politique IAM, que `nameServer`, `dsRecord` et `task` sur ce domaine (`infra/identity/`). State propre : clé `registrar/terraform.tfstate` du bucket R2, sans secret.

| Élément                                        | Rôle                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `module.delegation.ovh_domain_name_servers.fr` | serveurs de noms, **importés** (`imports.tf`), `prevent_destroy`                                                                                        |
| `module.delegation.ovh_domain_ds_records.fr`   | DS de la clé de Cloudflare (algorithme 13, KSK) ; absent tant que `ds_records` est vide ; refusé si les serveurs de noms ne sont pas ceux de Cloudflare |

Les valeurs sont dans `main.tf`, publiques (elles sont publiées en DNS), et changent **par PR, une étape à la fois** (`docs/runbook-cloudflare.md` §4). D'abord `name_servers` (sortie `fr_name_servers` de `infra/`), puis `ds_records` (`key_tag`, `public_key` de la sortie `fr_dnssec_ds`). Vider `ds_records` retire le DS : c'est le premier geste d'un retour arrière (§4.7).

## Avant et après chaque changement

```shell
npm run check:dnssec -- --phase=avant-ns        # DS absent chez d.nic.fr, 1.1.1.1, 8.8.8.8 depuis plus d'une heure, MX iCloud
npm run check:dnssec -- --phase=apres-ns        # délégation Cloudflare chez d.nic.fr, toujours aucun DS, MX iCloud
npm run check:dnssec -- --phase=avant-ds        # en plus : zone signée (DNSKEY)
npm run check:dnssec -- --phase=apres-ds --key-tag=<N>   # DS publié partout, MX validés (bit AD)
gh workflow run dnssec-check.yml -f phase=<phase>        # mêmes contrôles + dnsviz sans erreur (Linux)
```

`check:dnssec` interroge directement chaque serveur, le registre compris (client DNS UDP, `scripts/lib/dns-wire.mjs`), et sort en code 1 au moindre échec. L'historique local (`node_modules/.cache/check-dnssec.json`) prouve que le DS est absent depuis plus d'une heure : il faut lancer la commande au début de l'attente, puis à la fin.

## Commandes

```shell
npm run infra:registrar -- init
npm run infra:registrar -- plan -out=registrar.tfplan
npm run infra:registrar -- apply registrar.tfplan      # seulement un plan enregistré et relu
```

`infra:registrar` charge `OVH_CLIENT_ID`, `OVH_CLIENT_SECRET` (compte d'écriture, restreint à l'IP du propriétaire) et les clés S3 du state, jamais les jetons d'amorçage. Elle refuse toute destruction et tout `apply` sans plan (`scripts/lib/tf-args.mjs`).

## Dérive

`registrar-drift.yml` lance chaque jour un `plan` avec le compte de service **en lecture seule** (secrets `OVH_READ_CLIENT_ID`, `OVH_READ_CLIENT_SECRET`, clés R2 en lecture). Un écart ouvre une issue, une seule à la fois. Sans ces secrets, le job reste vert et le dit.
