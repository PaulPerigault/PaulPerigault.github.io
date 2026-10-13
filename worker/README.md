# Worker du formulaire de contact

Brique autonome : un Worker Cloudflare joignable sur `contact.paulperigault.dev`, qui reçoit le formulaire du site, vérifie Turnstile, puis envoie le message par Resend à `contact@paulperigault.fr`. **Rien n'est stocké ni journalisé.**

## Contrat HTTP

`POST /` avec `Content-Type: application/json` :

```json
{ "name": "…", "email": "…", "message": "…", "turnstileToken": "…", "website": "" }
```

| Cas                                                          | Statut | Corps                                                      |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------- |
| Envoyé (ou champ piège `website` rempli : rien n'est envoyé) | 200    | `{ "ok": true }`                                           |
| Preflight `OPTIONS` d'une origine autorisée                  | 204    | —                                                          |
| JSON invalide ou champs invalides                            | 400    | `{ "ok": false, "error": "invalid", "fields": ["email"] }` |
| Origine absente ou non autorisée                             | 403    | `{ "ok": false, "error": "forbidden" }`                    |
| Jeton Turnstile refusé                                       | 403    | `{ "ok": false, "error": "challenge" }`                    |
| Autre méthode                                                | 405    | `{ "ok": false, "error": "method" }` + `Allow`             |
| Corps > 32 Ko                                                | 413    | `{ "ok": false, "error": "too_large" }`                    |
| Pas du JSON                                                  | 415    | `{ "ok": false, "error": "unsupported" }`                  |
| Turnstile ou Resend injoignable / en erreur                  | 502    | `{ "ok": false, "error": "unavailable" }`                  |

Les erreurs sont génériques : un code stable que le formulaire traduit, jamais l'écho des valeurs reçues ni un détail interne. Longueurs maximales : `src/limits.ts` (le site applique les mêmes).

## Choix

- **CORS strict** : origines exactes lues dans `ALLOWED_ORIGINS` (`wrangler.toml`), jamais `*` (une valeur `*` est ignorée). `www.paulperigault.fr` redirige vers l'apex : non autorisé. `localhost` seulement via `.dev.vars`.
- **Ordre des contrôles** (`src/handler.ts`) : méthode, origine, type, taille (en flux, sans faire confiance à `Content-Length`), JSON, piège, champs, Turnstile, envoi. Le piège répond 200 pour ne rien apprendre au robot.
- **Minimisation** : `siteverify` sans `remoteip` ; message en texte brut (rien à échapper) ; `reply_to` = visiteur ; `observability` désactivée ; aucun `console`.
- **Dépendances injectées** : `createHandler({ fetch })` ; seul `src/index.ts` branche le vrai `fetch`. Les tests utilisent un faux `fetch` (`src/test/fakes.ts`), sans réseau.

## Commandes

```powershell
npm ci                 # dans worker/
npm run dev            # wrangler dev (http://127.0.0.1:8787), lit .dev.vars
npm run verify         # lint + format + types + tests
```

Développement local : copier `.dev.vars.example` en `.dev.vars` et le remplir (fichier git-ignoré). Depuis la racine du dépôt, `npm run verify` lance aussi `npm run verify:worker`.

## Secrets et déploiement

Secrets : `RESEND_API_KEY`, `TURNSTILE_SECRET`. Jamais dans `wrangler.toml` ni dans le dépôt. Le domaine personnalisé, le widget Turnstile et la répartition Terraform / Wrangler sont décrits dans `infra/` (issue #138) ; le déploiement CI dans #139.

## Supprimer cette brique

Supprimer `worker/`, le script `verify:worker` et `worker/src` dans `scripts/check-file-size.mjs`, l'ignore `worker/**` d'`eslint.config.mjs` ; le site garde son repli `mailto:`.
