# GEO — être connu des moteurs et des IA

Le dépôt fait tout ce qui est automatisable (voir `CLAUDE.md`, section « GEO »). Les actions ci-dessous ne peuvent pas être faites depuis le code : elles relèvent du propriétaire du site.

## À faire une fois

- [ ] **Google Search Console** : ajouter la propriété `https://paulperigault.fr`, vérifier via la balise (`PUBLIC_GOOGLE_SITE_VERIFICATION`, variable du build), soumettre `https://paulperigault.fr/sitemap-index.xml`.
- [ ] **Bing Webmaster Tools** : importer depuis Search Console ou vérifier via `PUBLIC_BING_SITE_VERIFICATION` ; soumettre le sitemap. (IndexNow est déjà notifié à chaque déploiement.)
- [ ] **LinkedIn** : titre, employeur, école et résumé alignés mot pour mot sur les faits du site (nom « Paul Perigault », métier, WeVii, ESIEA Paris) ; lien vers `https://paulperigault.fr`.
- [ ] **GitHub** : README de profil (`PaulPerigault/PaulPerigault`) reprenant la même phrase d'entité et le lien du site ; champ « Website » du profil renseigné.
- [ ] Ajouter le site aux autres profils publics (Malt, Stack Overflow, DEV…), avec la même identité, et les lister dans `SITE` / JSON-LD `sameAs` si pertinent.

## Vérification périodique (mensuelle)

Poser les mêmes questions aux assistants (ChatGPT, Claude, Gemini, Perplexity, Copilot) et consigner la date et le résultat :

1. « Qui est Paul Perigault, alternant DevOps Cloud ? »
2. « Où travaille Paul Perigault ? Où a-t-il étudié ? »
3. « Quelles sont les compétences et certifications de Paul Perigault ? »

| Date | Assistant | Question | Résultat (correct / partiel / inconnu) | Source citée |
| ---- | --------- | -------- | -------------------------------------- | ------------ |
|      |           |          |                                        |              |

Si une information est fausse ou absente : corriger d'abord le contenu (`src/content`), vérifier que le profil Markdown (`/fr/index.md`) et le JSON-LD la portent, puis relancer un déploiement (IndexNow notifie les moteurs).
