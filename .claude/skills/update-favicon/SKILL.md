---
name: update-favicon
description: Régénère le jeu complet de favicons et d'icônes web à partir d'un logo SVG ou raster. À utiliser lorsqu'un logo est ajouté ou modifié, lorsqu'un favicon doit être actualisé, ou lorsqu'il faut mettre à jour les balises d'icône dans index.html et ouvrir une pull request.
---

# Update favicon

Régénère les icônes web à partir d'un logo fourni en argument (`$ARGUMENTS`).
Si aucun fichier n'est indiqué, utilise `public/image/logo_concept_a_monogram.svg`
s'il existe, sinon recherche le SVG le plus pertinent dans le projet et demande
confirmation avant de l'utiliser.

## 0. Pré-requis
- Vérifier `gh auth status` ; si non authentifié, arrêter avant toute étape Git
  et le signaler clairement (pas de contournement silencieux).
- Vérifier l'état Git (`git status`) : si des changements non liés sont en
  cours, ne jamais les inclure ni les écraser — les laisser intacts.
- Vérifier les outils de rastérisation disponibles dans l'ordre de préférence :
  `sharp` (si présent en devDependency ou installable via npm), sinon
  ImageMagick (`convert`/`magick`), sinon `rsvg-convert`. Ne jamais écrire de
  binaire "à la main" — toujours passer par un outil dédié. Si aucun n'est
  disponible et qu'aucun ne peut être installé, arrêter et le dire.

## 1. Résolution de la source
- Chemin fourni en argument, sinon `public/image/logo_concept_a_monogram.svg`,
  sinon demander.
- Vérifier la lisibilité à 16px (contraste, complexité du tracé) ; si le logo
  complet semble inadapté en petit format, signaler et proposer une version
  simplifiée (monogramme seul, sans détails fins).

## 2. Génération (locale uniquement à cette étape)
Générer dans le dossier d'assets existant du projet (`public/` ou équivalent
déjà en place, ne pas créer une nouvelle arborescence) :
- `favicon.ico` (16x16 + 32x32 multi-résolution)
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `site.webmanifest` + icônes 192x192/512x512 — uniquement si le projet a déjà
  une logique PWA/manifest ; sinon ne pas l'ajouter.

## 3. Mise à jour du code
- Mettre à jour les balises `<link rel="icon"...>` dans `index.html` (ou
  l'équivalent SSR) sans dupliquer ni toucher au reste du `<head>`.

## 4. Vérifications
- Dimensions et validité des PNG générés, validité de l'ICO, validité JSON du
  manifest si généré, pas de lien cassé dans le HTML.
- Lancer le build du projet si un script existe (`npm run build`).
- Afficher un résumé des fichiers créés/modifiés et **attendre confirmation
  explicite** avant de passer à l'étape Git.

## 5. Git (uniquement après confirmation)
1. Créer (ou réutiliser si elle existe déjà et est propre) la branche
   `chore/favicon`.
2. Commit Conventional Commits : `chore(assets): regenerate favicons from logo`.
3. Push, puis `gh pr create` vers `develop` — décrire dans la PR : logo source,
   fichiers générés, balises modifiées, vérifications passées, limites connues
   du rendu en petit format.

## Documentation
Mettre à jour `CLAUDE.md` uniquement si la structure des assets ou les
conventions de génération changent réellement — pas pour une simple
régénération de fichiers.
