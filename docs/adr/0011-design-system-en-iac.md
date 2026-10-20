# ADR-0011 — Le dépôt design-system et sa documentation en OpenTofu

- Statut : accepté (2026-10-20, #268)

## Contexte

Le design system de paulperigault.fr devient un dépôt dédié, `PaulPerigault/design-system`, qui publie les paquets npm `@paulperigault/*` (son ADR-0001). Il a été créé par `gh repo create` (public, branche `develop` seule) pour ne pas bloquer le travail. Comme le portfolio (ADR-0010), rien de ce dépôt ne doit être réglé à la main : ni ses protections, ni ses environnements, ni l'hébergement de sa documentation (`ds.paulperigault.dev`).

## Décision

- **Même brique `infra/github/`**, même state : `design-system.tf` (dépôt **importé**, `prevent_destroy`, `archive_on_destroy`, branche par défaut importée, branche `main` créée depuis `develop`, alertes Dependabot) et `design-system-protections.tf` (rulesets `develop` et `main` : PR obligatoire, **squash seul**, check `ci`, 0 approbation ; actions autorisées restreintes à celles de GitHub plus release-please et zizmor ; environnements `npm-publish` et `docs-deploy` déployables depuis `main` seulement, sans contournement admin).
- **Message de squash = corps de la PR** (`PR_BODY`) : avec la règle commitlint du dépôt (aucune ligne `Co-authored-by`, aucun « Generated with »), aucun message d'un outil n'arrive sur `develop`.
- **Variable `design_system`** (défaut `true`) : la CI la pose à `false` tant que `IAC_GITHUB_READONLY_TOKEN` n'a pas accès au dépôt, et l'annonce par un avis ; le plan reste vert. Jamais `false` pour un apply.
- **Documentation sur Cloudflare Pages** : module `pages-site` réutilisé (`paulperigault-ds`, envoi direct, sans source Git) et nouveau module `dns-cname` (CNAME proxifié `ds.paulperigault.dev`, `tofu test`). L'hôte est exact : la redirection `.dev` → `.fr` ne le capture pas.
- **Jeton Pages dédié** `portfolio-ds-pages-deploy` (infra/identity), posé en **secret de l'environnement `docs-deploy`** du dépôt, jamais en secret de dépôt.

## Jeton Pages : comparaison

Cloudflare ne restreint pas la permission « Pages Write » à un seul projet : tout jeton Pages peut déployer sur tous les projets du compte, dont le site.

| Option | Secret en CI | Même artefact testé et déployé | Automatisable en IaC | Surface |
| --- | --- | --- | --- | --- |
| Jeton partagé avec le site | oui | oui | oui | une fuite touche les deux projets, révocation commune |
| **Jeton dédié, secret d'environnement `docs-deploy` (main seulement)** | oui | oui | oui | révocable seul ; lisible seulement par un job de `main` |
| Intégration Git de Pages | non | non (build chez Cloudflare) | partiel : application GitHub de Cloudflare installée à la main, avec accès au code | application tierce avec droits sur le dépôt |

Retenu : **jeton dédié confiné à l'environnement protégé**. C'est l'option la plus restrictive qui reste entièrement automatisable et garde le principe « construit une fois, testé, déployé tel quel ». Risque accepté : un workflow de `main` compromis pourrait déployer sur le projet du site ; il est limité par les rulesets (PR obligatoire, check `ci`) et par les actions autorisées.

## Conséquences

- L'apply se fait dans l'ordre `infra/github` (environnements), `infra/identity` (jeton et secret), puis `infra/` (Pages, DNS). Les commandes exactes sont dans `docs/infra.md` §7 et dans les [étapes manuelles du dépôt design-system](https://github.com/PaulPerigault/design-system/blob/develop/docs/manual-steps.md).
- Les jetons `GITHUB_IAC_TOKEN` et `IAC_GITHUB_READONLY_TOKEN` doivent être étendus à `PaulPerigault/design-system` (action propriétaire, aucune API).
- `scripts/check-github-plan.mjs` qualifie le faux écart des réglages de fusion **dépôt par dépôt** (GraphQL pour chacun).
- Premier plan local (2026-10-20) : `infra/github` 2 imports, 9 créations, 2 modifications (dépôt design-system adopté ; topics du portfolio), 0 destruction ; `infra/` 3 créations ; `infra/identity` non planifié en local (jetons de départ absents, `tofu test` vert).
