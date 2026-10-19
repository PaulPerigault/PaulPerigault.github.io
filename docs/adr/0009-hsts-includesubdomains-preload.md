# ADR-0009 — HSTS `includeSubDomains; preload` sur `paulperigault.fr`

- **Statut** : proposé (#210, PR en brouillon). À fusionner seulement après plusieurs semaines de HSTS simple (`max-age=63072000`) sans incident sur Cloudflare Pages (issue « Actions manuelles », #181).

## Contexte

Depuis la bascule vers Cloudflare Pages (ADR-0008), `public/_headers` envoie `Strict-Transport-Security: max-age=63072000` : le navigateur n'utilise plus que HTTPS pour l'apex, mais ni pour ses sous-domaines, ni dès la toute première visite. Relevé du 2026-10-19 (`npm run check:hsts`) : seul `www` existe parmi les sous-domaines web courants, et il répond en HTTPS ; la messagerie est chez iCloud (MX), sans HTTP.

## Décision

`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, puis inscription de `paulperigault.fr` sur hstspreload.org par le propriétaire. `npm run check:hsts` (lecture seule) vérifie avant la fusion que chaque sous-domaine existant répond en HTTPS.

## Risques (acceptés en connaissance de cause)

- **Toute la zone, présente et future** : `includeSubDomains` interdit HTTP à **tous** les sous-domaines, y compris ceux créés plus tard (un service OVH, une vérification de domaine par une page HTTP, un outil interne sans certificat). Ils deviennent injoignables tant qu'ils n'ont pas de certificat valide. Règle : ajouter tout nouveau sous-domaine à `scripts/check-hsts.mjs` **avant** de le créer, et ne le publier qu'avec HTTPS.
- **Préchargement quasi irréversible** : une fois dans la liste livrée avec Chrome, Firefox, Safari et Edge, un retrait demande une demande explicite puis **plusieurs mois** (cycle de publication des navigateurs) ; pendant ce temps, HTTP reste impossible. Un `max-age=0` n'annule pas la liste.
- **Pré-requis de hstspreload.org** : redirection HTTP → HTTPS sur l'apex, `max-age` d'au moins un an (deux ici), `includeSubDomains` et `preload` présents, `www` en HTTPS. `npm run check:live` contrôle déjà la redirection HTTP → HTTPS et l'en-tête exact.
- **Messagerie** : MX, SPF et DKIM ne sont pas concernés (pas de HTTP), mais une page d'autoconfiguration HTTP (`autoconfig.`, `autodiscover.`) le serait ; aucune n'existe.

## Conséquences

- (+) HTTPS dès la première visite, pour tout le domaine ; plus de fenêtre de rétrogradation.
- (−) Toute création de sous-domaine passe par HTTPS d'abord ; retour arrière lent (mois).
