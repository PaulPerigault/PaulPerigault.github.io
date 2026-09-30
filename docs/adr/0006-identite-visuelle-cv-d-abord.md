# ADR-0006 — Identité visuelle « CV d'abord »

- **Statut** : accepté (2026-09-30)
- **Contexte** : la première charte (« papier et encre » : fond crème, titres serif système, accent sarcelle, étiquettes mono, sections numérotées « 01 — », pastilles-tags, fausse invite `paul@perigault`) évitait les défauts visibles des sites générés (dégradés, ombres, emoji) mais est devenue elle-même un gabarit reconnaissable. Sur la plupart des machines, `ui-serif` retombe sur Times : aucune identité typographique. La carte de partage, elle, était un dégradé sombre : le premier gabarit. Constats et preuves : `docs/audit-ia.md`, partie B1.
- **Décision** : une page qui se lit comme un CV. Une seule famille auto-hébergée (Atkinson Hyperlegible Next), palette neutre et bleu outremer, titres de section à gauche, entrées séparées par des filets, technologies en texte simple, aucune numérotation, aucune étiquette mono ni majuscules espacées, feuille d'impression. Carte de partage et favicons générés depuis les mêmes sources (tokens, police, photo, `logo.svg`).
- **Conséquences** :
  - le style est encodé dans les garde-fous (`famille-typographique`, `etiquette-majuscules`, tests e2e de police chargée et de non-numérotation) pour qu'il ne dérive plus ;
  - la page raccourcit (environ 5 300 px → 3 600 px), l'ordre des sections suit celui d'un CV (expérience, formation, compétences) ;
  - +34 Ko de police (sous-ensemble latin, préchargé, `font-display: swap`) : le budget de poids de Lighthouse reste tenu ;
  - la police est sous licence SIL OFL : embarquée telle quelle, licence conservée dans le paquet npm ;
  - le logo (carré encre, P blanc) n'est plus teal ; un P blanc sur carré bleu évoquait un panneau de parking, d'où l'encre.
- **Ce que ce choix ne résout pas** : le design ne remplace pas le contenu (études de cas, chiffres, schémas) ; voir `docs/audit-ia.md`, partie C.
