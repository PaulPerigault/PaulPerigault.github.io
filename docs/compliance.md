# Conformité : RGPD, mentions légales, domaines

> Ce document décrit l'état technique du site. Ce n'est pas un avis juridique : l'exactitude des mentions (identité de l'éditeur, hébergeur) reste à valider par le propriétaire.

## Registre simple des traitements

| Traitement                          | Données                                                                | Où                                                                                                                                                                          | Base / statut                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Journaux d'accès de l'hébergeur     | adresse IP, date, pages                                                | GitHub Pages (hors de notre contrôle)                                                                                                                                       | responsabilité de GitHub, décrite dans sa déclaration de confidentialité                                       |
| Préférences d'affichage             | `theme`, `lang`                                                        | `localStorage` du navigateur du visiteur, jamais transmis                                                                                                                   | choix explicite du visiteur, exemptées de consentement                                                         |
| Courrier reçu                       | adresse e-mail, message                                                | boîte du propriétaire                                                                                                                                                       | intérêt légitime à répondre ; droits exercés par e-mail                                                        |
| Formulaire de contact               | nom, adresse e-mail, message ; jeton Turnstile                         | transit par le Worker Cloudflare `contact.paulperigault.dev` (**aucun stockage, aucune journalisation**), envoi par Resend (région UE, Irlande), puis boîte du propriétaire | intérêt légitime à répondre ; durée de conservation : **TODO propriétaire**                                    |
| Vérification anti-robot (Turnstile) | données techniques du navigateur et de la connexion, dont l'adresse IP | Cloudflare, **seulement après le premier focus** dans le formulaire ; valeur `cf.turnstile.u` dans le `localStorage` du cadre Cloudflare (pas celui du site)                | intérêt légitime (sécurité du formulaire) ; exemption de consentement à **valider par le propriétaire** (TODO) |

Le site n'a **aucun cookie ni mesure d'audience** et **ne charge aucune ressource tierce à l'ouverture des pages** (la CSP `default-src 'none'` l'interdit : voir ADR-0004). Seule exception, sur `/fr/` et `/en/` uniquement : le **formulaire de contact** (épic #133), qui charge Cloudflare Turnstile au premier focus et envoie le message au Worker ; la CSP de ces deux pages n'est ouverte qu'à ces deux origines. Le texte visible par les visiteurs est `src/content/{fr,en}/legal.json`, servi sur `/fr/legal/` et `/en/legal/` (lien dans le pied de page).

## Sous-traitants et transferts

| Sous-traitant       | Rôle                                                        | Localisation, transferts                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub, Inc.        | hébergement du site (GitHub Pages)                          | États-Unis ; cadre décrit dans sa déclaration de confidentialité                                                                                                                      |
| Cloudflare, Inc.    | Worker du formulaire, Turnstile, DNS de `paulperigault.dev` | réseau mondial, société américaine ; **TODO propriétaire** : vérifier l'accord de traitement (DPA) et le cadre de transfert (Data Privacy Framework ou clauses contractuelles types)  |
| Resend, Inc.        | envoi de l'e-mail du formulaire                             | envoi depuis la région UE (Irlande), société américaine ; **TODO propriétaire** : durée de conservation des journaux et du contenu des e-mails chez Resend, DPA et cadre de transfert |
| Apple (iCloud Mail) | boîte de réception `contact@paulperigault.fr`               | **TODO propriétaire** : à mentionner ou non selon votre analyse                                                                                                                       |

## Mesure de Turnstile (avant d'écrire le texte légal)

Mesuré, pas supposé : `e2e/measure-turnstile.spec.ts` (opt-in, hors CI : `MEASURE_TURNSTILE=1 npx playwright test measure-turnstile`, sur un build fait avec `PUBLIC_TURNSTILE_SITEKEY` ; `MEASURE_URL` pour viser la production). Il charge le **vrai** Turnstile, sans simulation, et écrit `test-results/turnstile-measure.json`.

Mesure du 2026-10-13 (Chromium de Playwright, Windows 11, `localhost`, **clé de test** Cloudflare `1x00000000000000000000AA`) :

| Observation                               | Avant le premier focus | Après le premier focus                                                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requêtes hors du site                     | aucune                 | 4, toutes vers `https://challenges.cloudflare.com` : `/turnstile/v0/api.js?render=explicit`, un second script `/turnstile/v0/g/<version>/api.js`, le document du cadre `/cdn-cgi/challenge-platform/…`, un script `blob:` interne au cadre |
| Cookies (toutes origines)                 | aucun                  | **aucun**                                                                                                                                                                                                                                  |
| `localStorage` / `sessionStorage` du site | vides                  | vides                                                                                                                                                                                                                                      |
| Stockage du cadre Cloudflare              | —                      | `localStorage` : `cf.turnstile.u` (origine `challenges.cloudflare.com`, cloisonnée)                                                                                                                                                        |
| Violations de la CSP du site              | aucune                 | **aucune**                                                                                                                                                                                                                                 |

**TODO propriétaire** : refaire la mesure avec la **clé de production** une fois le widget créé (#138) et le site déployé (`MEASURE_URL=https://paulperigault.fr/fr/`) ; une clé réelle peut déclencher davantage d'échanges (défi interactif, jeton d'accès privé) que la clé de test.

## Preuves automatisées

- `e2e/privacy.spec.ts` : aucune requête hors de l'origine du site, aucun `Set-Cookie`, aucun iframe ni script tiers, aucun outil de mesure d'audience dans le HTML ; après un parcours complet, **zéro cookie** et `localStorage` limité à `theme` et `lang` (valeurs attendues) ; sans interaction, rien n'est écrit (ni cookie, ni `localStorage`, ni `sessionStorage`, ni IndexedDB).
- `e2e/csp.spec.ts` : la politique interdit toute charge tierce et le test du canari prouve qu'elle est appliquée.
- `e2e/privacy-contact-form.spec.ts` et `e2e/csp-contact-form.spec.ts` : formulaire (Turnstile et Worker simulés) — rien de tiers avant le focus, ensuite seulement Turnstile puis le Worker, aucun cookie, stockage du site inchangé ; CSP ouverte à ces deux origines et seulement sur `/fr/` et `/en/`.
- `e2e/legal.spec.ts` et `e2e/accessibility.spec.ts` : la page légale est complète, localisée, indexable, dans le sitemap et sans violation d'accessibilité.

## Domaines

| Domaine             | Rôle                                                             | Où ça se règle                                                                   |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `paulperigault.fr`  | domaine **canonique** (canonical, hreflang, sitemap, Open Graph) | Réglages du dépôt → Pages → Custom domain ; « Enforce HTTPS » activé             |
| `paulperigault.dev` | doit **rediriger** vers le `.fr`                                 | Chez le registrar/DNS (GitHub Pages ne gère qu'un domaine personnalisé par site) |

Procédure complète et contrôle automatisé : `docs/infra.md` (`npm run check:live`). Redirection attendue pour le `.dev` : **301 permanent**, HTTPS, chemin et paramètres conservés (`https://paulperigault.dev/fr/` → `https://paulperigault.fr/fr/`), y compris pour `www.`. À vérifier :

```
curl -sI https://paulperigault.dev/en/ | grep -i -E "^(HTTP|location)"
curl -sI http://paulperigault.fr/fr/  | grep -i -E "^(HTTP|location)"   # doit renvoyer vers https
```

Le dépôt ne peut pas porter cette redirection ; c'est une décision d'infrastructure du propriétaire.

## À revalider si le site évolue

Ajouter un outil de mesure d'audience, un formulaire, un service tiers (polices, vidéo, carte, commentaires) ou un nouveau cookie change l'analyse : mettre à jour `legal.json`, la CSP, le registre ci-dessus, et prévoir un recueil de consentement si un traceur non exempté apparaît. Les tests `privacy.spec.ts` et `csp.spec.ts` échoueront avant que cela n'arrive en production.
