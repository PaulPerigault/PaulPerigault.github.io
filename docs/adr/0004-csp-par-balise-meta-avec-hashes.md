# ADR-0004 — CSP par balise `<meta>` avec hashes générés au build

- **Statut** : accepté

## Contexte

GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP : l'ancien CSP de `nginx.conf` ne protégeait pas le site réel et aurait, de plus, bloqué ses scripts inline.

## Décision

- Utiliser `security.csp` d'Astro : chaque page reçoit une `<meta http-equiv="content-security-policy">` avec les hashes SHA-256 de ses scripts et styles ; `default-src 'none'` par défaut, ni `unsafe-inline` ni `unsafe-eval`.
- Les deux scripts inline (initialisation du thème, redirection de la racine) sont autorisés par leur empreinte (`Astro.csp.insertScriptHash`), calculée depuis la même chaîne que celle injectée.
- `connect-src 'self'` (même origine) car Lighthouse lit `robots.txt` par un `fetch` depuis la page.
- `nginx.conf` ajoute ce que la balise ne peut pas exprimer (`frame-ancestors`, HSTS, COOP/CORP…) sans répéter les hashes.

## Conséquences

- (+) Politique stricte, testée : politique lue, hash exact de chaque script inline, script injecté bloqué (canari), zéro violation sur les parcours.
- (−) `frame-ancestors`, HSTS et les autres en-têtes n'existent toujours pas sur GitHub Pages ; la solution (proxy type Cloudflare) reste une décision d'infrastructure du propriétaire.
- (−) Astro place la balise après le contenu de `<head>` (script inline, JSON-LD, balises SEO) et une CSP en `<meta>` ne couvre que ce qui la suit ; la position n'est pas réglable avec `security.csp`. `e2e/csp-position.spec.ts` (#200) garantit que rien d'externe ni d'actif ne la précède et que chaque script inline qui la précède est déjà autorisé par son hash.
