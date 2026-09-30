# Conformité : RGPD, mentions légales, domaines

> Ce document décrit l'état technique du site. Ce n'est pas un avis juridique : l'exactitude des mentions (identité de l'éditeur, hébergeur) reste à valider par le propriétaire.

## Registre simple des traitements

| Traitement                      | Données                 | Où                                                        | Base / statut                                                            |
| ------------------------------- | ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Journaux d'accès de l'hébergeur | adresse IP, date, pages | GitHub Pages (hors de notre contrôle)                     | responsabilité de GitHub, décrite dans sa déclaration de confidentialité |
| Préférences d'affichage         | `theme`, `lang`         | `localStorage` du navigateur du visiteur, jamais transmis | choix explicite du visiteur, exemptées de consentement                   |
| Courrier reçu                   | adresse e-mail, message | boîte du propriétaire                                     | intérêt légitime à répondre ; droits exercés par e-mail                  |

Le site n'a **aucun cookie, aucune mesure d'audience, aucun formulaire, aucune ressource tierce** (la CSP `default-src 'none'` l'interdit : voir ADR-0004). Le texte visible par les visiteurs est `src/content/{fr,en}/legal.json`, servi sur `/fr/legal/` et `/en/legal/` (lien dans le pied de page).

## Preuves automatisées

- `e2e/privacy.spec.ts` : aucune requête hors de l'origine du site, aucun `Set-Cookie`, aucun iframe ni script tiers, aucun outil de mesure d'audience dans le HTML ; après un parcours complet, **zéro cookie** et `localStorage` limité à `theme` et `lang` (valeurs attendues) ; sans interaction, rien n'est écrit (ni cookie, ni `localStorage`, ni `sessionStorage`, ni IndexedDB).
- `e2e/csp.spec.ts` : la politique interdit toute charge tierce et le test du canari prouve qu'elle est appliquée.
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
