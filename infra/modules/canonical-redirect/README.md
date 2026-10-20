# Module `canonical-redirect`

Redirection **301** d'hôtes secondaires vers l'origine canonique, chemin et paramètres conservés : `https://<hôte>/<chemin>?<paramètres>` → `<target_origin>/<chemin>?<paramètres>`.

| Ressource                     | Rôle                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_ruleset.redirect` | ruleset de zone de la phase `http_request_dynamic_redirect` (_Rules → Redirect Rules_), une règle `http.host in {…}` |

Une zone n'a **qu'un** ruleset par phase : ce module possède toute la phase de redirection de sa zone. Une redirection créée à la main dans le tableau de bord doit donc être **importée** (`infra/imports.tf`, identifiant donné par `npm run infra:rulesets`), sinon la création échoue. La règle ne s'applique qu'aux hôtes **proxifiés**.

Utilisé deux fois par la racine (`infra/main.tf`) :

- `dev_redirect` : `paulperigault.dev` et `www.paulperigault.dev` → `https://paulperigault.fr` (ruleset existant, importé ; `www` manquait, #181) ;
- `fr_www_redirect` : `www.paulperigault.fr` → `https://paulperigault.fr` (GitHub Pages le faisait seul ; sans effet tant que `www` est en DNS seul).

## Entrées

`zone_id`, `hosts` (au moins un, en minuscules), `target_origin` (`https://<domaine>`, sans barre finale).

## Sorties

`ruleset_id`.
