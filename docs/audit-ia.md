# Audit : les défauts des sites « vibe codés » par IA, puis analyse de ce site

> Rapport du 2026-09-30, fait sur le site tel que construit depuis `develop` (captures Chromium en clair, sombre et mobile ; HTML, JSON-LD, sitemap et `robots.txt` lus dans `dist/`). Le site en ligne n'est pas joignable depuis l'environnement d'audit : rien ici n'a été mesuré sur `paulperigault.fr` lui-même. Les jugements de design sont des jugements ; les mesures sont données comme telles.

## Verdict en cinq lignes

1. **Technique : solide.** Performance, accessibilité automatisée, sécurité, RGPD, données structurées et fichiers pour les IA sont au niveau ou au-dessus de ce que font les sites de portfolio.
2. **Ton ressenti est juste : le site fait IA.** Pas à cause de défauts visibles (ni dégradé, ni emoji, ni fausse formule), mais parce qu'il coche la version 2026 du « style anti-IA » : fond crème, titres serif système, accent sarcelle, étiquettes en mono, sections numérotées, puces-tags, fausse invite de terminal. C'est moi qui l'ai construit ainsi ; la charte « papier et encre » est devenue un gabarit reconnaissable.
3. **Le vrai problème est le contenu, pas le style.** Un paragraphe identique répété trois fois, un intitulé (« Ingénieur DevOps ») plus haut que la réalité (alternant, étudiant), quarante technologies sans preuve, un seul projet, aucun chiffre, aucun schéma.
4. **SEO : la base technique est complète, le reste ne se règle pas dans le code.** Trois vrais défauts corrigeables (titre trop générique, `lastmod` du sitemap faux, CV hébergé de façon non indexable) ; le reste est éditorial et externe (contenu, liens entrants, profils).
5. **« Tout parfait » n'existe pas** ; ce qui existe : des défauts connus, classés, avec leur propriétaire. C'est le plan plus bas.

## Partie A : les défauts typiques d'un site généré par IA

Pour chaque famille : le symptôme, comment le repérer, et l'état de ce site (✔ sain, ⚠ à améliorer, ✘ défaut).

### A1. Design : l'esthétique par défaut

- **Symptômes** : dégradés indigo/violet, verre dépoli, cartes très arrondies avec ombre, texte en dégradé dans le hero, grille de trois « features » avec icônes, néons en mode sombre, emoji en puces, illustrations génériques, même espacement partout.
- **Le piège de la « réaction »** : chasser ces défauts pousse vers l'autre gabarit de 2025-2026 (fond crème, serif d'affichage, accent terracotta ou sarcelle, étiquettes en mono, filets fins, numéros « 01 »). Ce gabarit est devenu, lui aussi, un marqueur.
- **Ce site** : ✔ aucun dégradé, ombre, flou ou emoji sur les pages (vérifié en e2e). ✘ mais il est **pile dans le second gabarit** (voir partie B). ✘ La carte de partage `public/image/og-cover.png` est, elle, un dégradé sombre avec une fausse invite `paul@perigault` : le premier gabarit, et à l'opposé du site.

### A2. Texte : la voix générique

- **Symptômes** : « passionné par », « solutions innovantes », séries de trois adjectifs, tirets cadratins partout, phrases symétriques, titres gonflés, aucune date, aucun nom propre, aucun chiffre, aucun résultat.
- **Ce site** : ✔ pas de formule creuse ; phrases factuelles (employeur, outils). ⚠ Trois répétitions du même paragraphe (hero, à propos, contact). ✘ Aucun résultat chiffré nulle part. ⚠ Tirets cadratins dans les titres (« Paul Perigault — Ingénieur DevOps », « Piscine — formation intensive ») : usage courant, mais c'est aussi un tic reconnu.

### A3. Substance : du décor sans preuve

- **Symptômes** : liste de technologies sans contexte, « expert en tout », projets sans lien ni résultat, réalisations non vérifiables.
- **Ce site** : ✘ 42 technologies en six lignes (Metasploit, Pentest, Nmap pour un profil DevOps cloud) sans niveau ni projet associé ; le même inventaire alimente le JSON-LD `knowsAbout`, donc les IA le répètent. ✘ Un seul projet mis en avant (`GetUrlCloudRun`), dont le texte vient de la description GitHub.

### A4. SEO : ce que les générateurs oublient

- **Symptômes** : rendu 100 % JavaScript (invisible pour la plupart des robots), titre et description dupliqués ou absents, canonical faux, hreflang non réciproques, sitemap avec des dates inventées, données structurées invalides, pages minces, aucun lien entrant.
- **Ce site** : ✔ HTML statique complet, canonical fixe, hreflang réciproques avec `x-default`, JSON-LD cohérent avec le texte, sitemap, 404 propre. ⚠ Titre et description génériques. ✘ `lastmod` = date du build (voir B3). ⚠ Deux pages indexables (+ mentions légales) : très peu de surface pour des requêtes de longue traîne.

### A5. GEO : être connu des assistants IA

- **Symptômes** : robots IA bloqués (parfois par le CDN, sans que le propriétaire le sache), contenu rendu côté client, identité incohérente d'un profil à l'autre, aucune source citable.
- **Ce site** : ✔ `robots.txt` ouvert à tous les crawlers de recherche et d'IA, faits en HTML statique, profil Markdown par langue. ⚠ Deux précisions d'honnêteté : **`llms.txt` n'a aucun effet prouvé** (aucun grand fournisseur n'a confirmé le lire ; il ne coûte rien, il ne fait pas de miracle) ; et **ce qui fait connaître une personne à un modèle, ce sont des sources tierces** (LinkedIn, GitHub, pages de l'école et de l'employeur, articles), pas le site seul.

### A6. Accessibilité

- **Symptômes** : contrastes insuffisants, focus invisible, images sans alt, hiérarchie de titres cassée, menus inutilisables au clavier, animation sans respect de `prefers-reduced-motion`.
- **Ce site** : ✔ zéro violation axe (WCAG 2.0 à 2.2 A/AA) sur toutes les pages, thèmes et tailles ; contrastes testés ; menu natif `<dialog>`. ⚠ **L'audit automatique ne trouve qu'une partie des problèmes** (les estimations vont d'environ un tiers à plus de la moitié). Non fait : passage au lecteur d'écran (NVDA/VoiceOver), zoom 400 %, navigation clavier manuelle complète.

### A7. Performance

- **Symptômes** : mégaoctets de JavaScript pour une page statique, polices web bloquantes, images non optimisées, scripts tiers.
- **Ce site** : ✔ mesuré : environ 1 Ko de JS gzip, page de 21,6 Ko, aucune requête tierce, Lighthouse 100/100/100/100 en local (budgets stricts en CI). Rien à ajouter.

### A8. Sécurité et vie privée

- **Symptômes** : aucune politique de sécurité de contenu, polices Google chargées à distance (déjà sanctionné en Allemagne, LG München, 2022), bandeau de cookies décoratif, aucune mention légale, secrets dans le dépôt.
- **Ce site** : ✔ CSP stricte par balise `<meta>`, aucun cookie ni traceur, mentions légales FR/EN, actions épinglées par SHA, permissions minimales. ⚠ Les en-têtes HTTP (HSTS, `frame-ancestors`…) dépendent de Cloudflare : voir `docs/infra.md`.

### A9. Maintenabilité du code

- **Symptômes** : composants géants, copier-coller, code mort, dépendances inventées ou obsolètes, aucun test, README qui décrit autre chose, aucun historique lisible.
- **Ce site** : ✔ fichiers ≤ 120 lignes, couches vérifiées, tests unitaires et e2e, historique en Conventional Commits, documentation contrôlée par `npm run check:docs`. ⚠ **Sur-ingénierie** : environ 2 500 lignes de code et 194 fichiers (source, tests, scripts) pour deux pages. À assumer plutôt qu'à cacher : pour un profil DevOps, l'outillage est la démonstration (voir C2).

## Partie B : analyse de ce site

### B1. Pourquoi il « fait IA » (ordre d'importance, preuves sur les captures)

1. **Le gabarit « éditorial minimal »** : fond crème `#f5f1e8`, sarcelle unique, titres en serif système. Sur la plupart des machines, `ui-serif` retombe sur Times/Liberation Serif : le nom en 88 px ressemble à une police par défaut non choisie. **Aucune identité typographique.**
2. **Les tics de gabarit** : numéros « 01 — », étiquettes en mono, icône par catégorie de compétences, tags en pastilles, filets à chaque section.
3. **La fausse invite `paul@perigault`** dans la barre de navigation et sur la carte de partage : signature d'ingénieur, jouée par tout le monde.
4. **Un rythme uniforme** : huit sections de même poids (même titre, même marge, un filet), 5 300 px de page ; les faits les plus forts (alternance chez WeVii, cycle ingénieur ESIEA, certifications Google Cloud/AWS) ne sont pas mis en avant.
5. **Peu de personnalité et aucune preuve visuelle** : un portrait carré de 200 px, aucun schéma d'architecture, aucune capture, aucun chiffre. Un portfolio DevOps sans un seul diagramme.
6. **La carte Open Graph** : dégradé sombre, contradictoire avec le site (et avec la charte).

Ce qui joue **pour** le site : vraie photo, contenu factuel, aucune formule creuse, performance visible.

### B2. Problèmes de contenu (à toi de trancher : ce sont tes faits)

- **Intitulé au-dessus de la réalité.** Le hero dit « ingénieur DevOps » ; l'à-propos dit « étudiant ingénieur » ; l'expérience dit « Apprenti DevOps Cloud ». Un recruteur relève l'écart, et les IA répètent « est ingénieur DevOps ». Formulations exactes et défendables : « Alternant DevOps Cloud » ou « Apprenti ingénieur DevOps ». (Le titre d'ingénieur _diplômé_ est protégé par la loi ; « ingénieur DevOps » comme intitulé de poste est courant, mais ce n'est pas ton cas aujourd'hui.)
- **Même paragraphe trois fois** (hero, à propos, contact) puis dans le JSON-LD, `llms.txt` et le Markdown. La répétition est voulue pour les machines ; visible trois fois sur la page, elle sonne creux. L'à-propos devrait apporter ce que le hero ne dit pas.
- **« J'interviens en école »** : quelle école, quand, sur quel sujet ? C'est ton élément le plus rare et il tient en une phrase sans détail.
- **Compétences** : ne garder que ce que tu sais défendre en entretien, groupées par niveau ou par projet ; supprimer les mots-clés isolés.
- **Projets** : un seul, décrit par la ligne GitHub. Voir C2.
- **Parité FR/EN** : le sous-titre du contact diffère entre les langues (« en alternance, disponible pour… » contre « DevOps engineer — available for… »).

### B3. SEO : défauts vérifiés dans le code

| #   | Constat                                                                                                                                         | Effet                                                                                             | Correction                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `<title>` = « Paul Perigault — Ingénieur DevOps » ; description de 92 caractères                                                                | Aucun mot-clé porteur (alternant, cloud, Kubernetes, Terraform) ; espace de description inutilisé | Titre ≤ 60 caractères avec le vrai intitulé + spécialités ; description 140-160 caractères                                  |
| 2   | `lastmod` du sitemap = date du build, donc **change toutes les semaines** (redéploiement planifié) sans changement de contenu                   | Google ignore `lastmod` quand il est peu fiable                                                   | Dater par le dernier commit qui touche le contenu (corrigé dans ce lot)                                                     |
| 3   | CV servi par `raw.githubusercontent.com` : `application/octet-stream`, téléchargé sous le nom `main.pdf`, dépend d'une branche d'un autre dépôt | Non indexable, nom peu soigné, lien cassé si le dépôt bouge                                       | Héberger `cv-paul-perigault.pdf` sur le site (décision de confidentialité : un CV indexé peut exposer adresse et téléphone) |
| 4   | `ProfilePage` sans `dateModified`                                                                                                               | Champ recommandé par Google pour les pages de profil                                              | À ajouter avec la même source de date que le sitemap                                                                        |
| 5   | `Person.knowsAbout` : 42 entrées, dont Metasploit, Pentest                                                                                      | Dilue le signal ; affirme des compétences non prouvées                                            | Réduire au cœur de métier                                                                                                   |
| 6   | Deux pages indexables seulement                                                                                                                 | Aucune requête de longue traîne possible                                                          | Études de cas (C2)                                                                                                          |
| 7   | Homonymes possibles pour « Paul Perigault »                                                                                                     | Confusion d'entité                                                                                | Profils liés entre eux (`sameAs`), même formulation partout (`docs/geo-checklist.md`)                                       |

Ce qu'on ne peut pas promettre : une position. Le classement sur le nom vient surtout des liens entrants et des profils ; sur « alternant DevOps Paris », la concurrence est forte et il faudra du contenu (études de cas, un ou deux articles réels) pour exister.

## Partie C : plan d'amélioration

### C1. Corrections objectives (traitées ou traitables sans ton avis)

- [x] Redirection `.dev`, HTTPS, en-têtes, Search Console : procédure et contrôle automatique (`docs/infra.md`, `npm run check:live`).
- [x] Variables de vérification Search Console/Bing câblées dans `build.yml` (documentées, mais jamais transmises jusque-là).
- [x] Dependabot n'ouvre plus de PR pour une majeure de `node` (build aligné sur `.nvmrc`).
- [x] `lastmod` du sitemap fondé sur le contenu.

### C2. Décisions à prendre (recommandation en premier)

1. **Direction du design.** Recommandé : **« CV d'abord »** : une page sobre, très lisible, avec une vraie typographie choisie et auto-hébergée (pas une police système), une palette qui n'est ni crème ni sarcelle, aucune numérotation ni pastille, feuille de style d'impression. Alternatives : « dossier technique » (études de cas avec schémas au centre) ou « le site comme preuve » (statut du pipeline, scores, date de déploiement affichés). Les deux se combinent avec la première.
2. **Le meilleur contenu que tu as, c'est ce site lui-même.** Une étude de cas honnête : problème, architecture (schéma), pipeline, garde-fous, mesures (86 Ko → 1 Ko de JS, Lighthouse 100, zéro requête tierce), limites. Puis une étude de cas sur ton travail chez WeVii (dans les limites de ce que tu peux publier). C'est ce qui distingue vraiment d'un modèle de portfolio, et ce qui crée des pages indexables.
3. **Intitulé** : « Alternant DevOps Cloud » (ou autre formulation exacte) partout : hero, titre, JSON-LD, Markdown.
4. **CV** : héberger sur le site ou non (confidentialité).

### C3. Ce que seul toi peux faire

Réglages DNS/Cloudflare/Search Console (`docs/infra.md`) ; fournir chiffres, contexte et autorisations de publication ; relire les mentions légales ; aligner LinkedIn et GitHub ; obtenir des liens entrants (page de l'école, de l'employeur, communauté, articles).

## Ce qui a été vérifié, et ce qui ne l'a pas été

- **Vérifié** : rendu statique, en-têtes `<head>`, JSON-LD, sitemap, `robots.txt`, `llms.txt`, poids et fichiers de `dist/`, captures de la page en clair, sombre et mobile, CI verte (tests unitaires, e2e, axe, Lighthouse en CI).
- **Non vérifié** : le site en production, les en-têtes HTTP réels, la redirection `.dev`, l'indexation réelle par Google/Bing, la connaissance du modèle (`docs/geo-checklist.md`), le lecteur d'écran, la version anglaise à l'œil par un locuteur natif, le lien du CV (bloqué depuis l'environnement d'audit sauf test d'en-têtes).
