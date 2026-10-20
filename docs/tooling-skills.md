# Plugins et skills de Claude Code

Audit fait le 2026-10-18, **avant toute installation** : clone en lecture seule hors du dépôt, lecture de `plugin.json`, `hooks/`, `.mcp.json`, des scripts et des `SKILL.md`. Aucun script tiers n'a été exécuté. Un skill apporte une méthode, pas une autorité : `CLAUDE.md`, `npm run guard` et `npm run verify` l'emportent toujours.

## Épinglage

- Côté dépôt, Claude Code ne permet d'épingler une marketplace que par `ref` (branche ou tag) dans `extraKnownMarketplaces` ; **aucun épinglage par commit n'est possible côté consommateur**. Seul le mainteneur d'une marketplace peut fixer `sha` sur une entrée de plugin.
- La marketplace officielle `claude-plugins-official` épingle chaque plugin par `sha`. Les marketplaces tierces retenues ne le font pas : le SHA audité est consigné ci-dessous, et une mise à jour de ces marketplaces impose un nouvel audit.
- `enabledPlugins` au niveau projet : `true` pour les plugins retenus, `false` pour les plugins installés mais non retenus (un `false` projet l'emporte sur un `true` utilisateur).

## Marketplaces

| Marketplace | Source | SHA audité |
| --- | --- | --- |
| `claude-plugins-official` | `anthropics/claude-plugins-official` | SHA par plugin (ci-dessous) |
| `addy-web-quality-skills` | `addyosmani/web-quality-skills` | `afa8da942115f2961fdbfa80807ea0b232ff6c00` |
| `trailofbits` | `trailofbits/skills` | `5c99c03fb8a9ea568432ecbcba5d86e9f4ac2bf0` |
| `superpowers-marketplace` | `obra/superpowers-marketplace` | `2cf27fa76667afa0ba724ad8141a6938a3834e32` (écartée) |

## Retenus

| Plugin | SHA | Hooks ajoutés | Réserve |
| --- | --- | --- | --- |
| `superpowers@claude-plugins-official` | `bb92a77` (v7.0.0) | `SessionStart` : injecte `using-superpowers` (local, déterministe) | Jamais de fusion locale (option 1 de `finishing-a-development-branch`), `npm ci` au lieu de `npm install`, pas d'artefacts `docs/superpowers/`, worktrees dans `.claude/worktrees/`. Les validations humaines prévues sont tranchées par l'agent et notées dans la PR. |
| `pr-review-toolkit@claude-plugins-official` | `ea10b21` | aucun | — |
| `claude-md-management@claude-plugins-official` | `2a8ad9f` | aucun | — |
| `claude-code-setup@claude-plugins-official` | `2a8ad9f` | aucun | Ignorer la règle d'autorisation `Bash(git commit:*)` qu'il suggère. |
| `claude-security@claude-plugins-official` | `2a8ad9f` (0.12.0) | `UserPromptExpansion`, `PostToolUse(Bash)`, `PostToolUseFailure`, `PermissionRequest` : bannière, astuce après push, non bloquants | Écrit `CLAUDE-SECURITY-<date>/` dans le dépôt (auto-ignoré). |
| `typescript-lsp@claude-plugins-official` | `2a8ad9f` | aucun (LSP) | Binaire global `typescript-language-server` 5.3.0. |
| `chrome-devtools-mcp@claude-plugins-official` | `a878bca` | aucun ; MCP `chrome-devtools-mcp@1.11.0` (épinglé) | Remplace `playwright` pour les captures avant/après et Lighthouse. |
| `web-quality-skills@addy-web-quality-skills` | `afa8da9` (v2.0.0) | aucun | Ignorer la préconnexion à des polices ou CDN tiers (contraire à la CSP) et l'avis contre `llms.txt` ; ne pas lancer `npx lighthouse` ni `npm i -g` non épinglés (Lighthouse CI existe). |
| `git-cleanup@trailofbits` | `5c99c03` | aucun | Ne s'exécute que sur commande ; il supprime avec `-D` après une seule confirmation : la preuve `headRefOid` du dépôt est recalculée avant. |
| `differential-review@trailofbits` | `5c99c03` | aucun | — |
| `sharp-edges@trailofbits` | `5c99c03` | aucun | — |
| `variant-analysis@trailofbits` | `5c99c03` | aucun | Semgrep ou CodeQL à installer soi-même. |
| `mutation-testing@trailofbits` | `5c99c03` | aucun | Outils de mutation à installer soi-même, seulement sur `src/lib/`, `src/services/`, `worker/src/`. |
| `static-analysis@trailofbits` | `5c99c03` | aucun | Clone des règles Semgrep tierces non épinglées ; jamais de `pip install` dans le dépôt. |
| `supply-chain-risk-auditor@trailofbits` | `5c99c03` | aucun | Envoie noms et versions des dépendances (publiques) à osv.dev, npm, deps.dev, scorecard ; lit le jeton `gh` pour api.github.com uniquement. |
| `insecure-defaults@trailofbits` | `5c99c03` | aucun | Demande de lire les fichiers `.env*` : bloqué par les `deny` et le hook `guard-secret-files`, c'est voulu. |

## Écartés (désactivés dans ce projet)

| Plugin | Raison |
| --- | --- |
| `fp-check@trailofbits` | Hooks `Stop` et `SubagentStop` de type prompt sur toutes les sessions : non déterministes, latence et coût. La contre-vérification se fait par un sous-agent indépendant. |
| `rust-review@trailofbits` | Pas de Rust (portage décidé en Node). |
| `superpowers@superpowers-marketplace` | Code identique à la version officielle, mais suit la branche par défaut sans épinglage. |
| `playwright@claude-plugins-official` | MCP `@playwright/mcp@latest`, non épinglé. |
| `security-guidance` (officiel, `claude-code-skills`, organisation) | Trois copies ; la version officielle installe `claude-agent-sdk` sans version épinglée et envoie les diffs à l'API ; doublon de `claude-security`. |
| `code-review@claude-plugins-official` | Ajoute « Generated with Claude Code » aux commentaires de PR ; le skill intégré `/code-review` le remplace. |
| `code-simplifier@claude-plugins-official` | Doublon de `pr-review-toolkit:code-simplifier` et de `/simplify`. |
| `commit-commands@claude-plugins-official` | `git branch -D`, `git worktree remove --force`, ignore `develop` protégé. |
| `serena@claude-plugins-official` | MCP lancé depuis la tête d'un dépôt git, non épinglé. |
| `hookify`, `code-modernization`, `postman`, `learning-output-style` (officiels) ; `agent-memory`, `agent-launcher-skills`, `self-improving-agent` (`claude-code-skills`) | Hooks hors périmètre : télémétrie, injection de contexte, écriture de `.memory/` dans le dépôt, mode qui demande du code au propriétaire. |

Les autres plugins installés au niveau utilisateur qui n'ont ni hook ni MCP local (skills seuls) restent visibles mais ne sont pas utilisés dans ce dépôt.

## Garde-fous de l'assistant (`.claude/settings.json`)

Tout est déclaré dans le dépôt et vérifié par `scripts/claude-settings.test.mjs` :

- `"attribution": { "commit": "", "pr": "" }` : aucune signature d'outil dans les commits et les PR.
- **Hooks `PreToolUse`** (Bash et PowerShell, bloquants, déterministes) :
  - `scripts/guard-secret-files.mjs` : refuse toute commande qui cite un fichier de secrets local ;
  - `scripts/guard-pr-merge.mjs` (logique dans `scripts/lib/pr-merge-guard.mjs`, tests `scripts/guard-pr-merge.test.mjs` et `scripts/pr-merge-guard-args.test.mjs`) : toute commande `gh pr merge` doit citer un numéro de PR explicite dont la base et la tête, lues par `gh pr view <n> --json baseRefName,headRefName,isCrossRepository`, sont admises par `scripts/lib/pr-merge-policy.mjs` : base `develop`, ou base `main` avec la tête `develop` ou la branche de release-please, jamais depuis un fork (#181, tests `scripts/pr-merge-policy.test.mjs`, dont le hook lancé par Bash avec un faux `gh`). Numéro absent, variable shell, PR illisible ou autre couple base/tête : refus. Chaque sous-commande d'une commande composée est contrôlée, y compris dans un shell imbriqué (`bash -c "…"`) et avec `-R`/`--repo` placé avant `merge` ou même avant `pr` (`gh -R o/r pr merge 1`, accepté par gh, #192 ; doublé par des règles `deny`), avec `GH_REPO=` en préfixe, une URL de PR d'un autre dépôt (son dépôt est lu dans l'URL), `gh` appelé par son chemin, via un lanceur (`env`, `sudo`, `command`…) ou dans une substitution `$(…)` (revue finale, #180 ; découpage dans `scripts/lib/shell-segments.mjs`) ; le même texte entre guillemets (message de commit, `grep`) n'est pas une fusion.
- **Règles `deny`** (mêmes motifs pour `Bash(...)` et `PowerShell(...)`, vérifié par `scripts/claude-settings-guardrails.test.mjs`) : `terraform`/`tofu` appelés directement en `apply`, `destroy`, `-destroy` et `import` ; toute destruction par les scripts `infra:*` ; l'appel direct par `node` des scripts `infra-*.mjs` en `apply` et de `infra-identity-push.mjs` ; `show`, `state`, `output` nu ou `-json` et les sorties secrètes, qui afficheraient une valeur de secret ; `npm run infra:worker-secrets` ; `wrangler deploy`, `wrangler secret`, `wrangler versions deploy` et `wrangler … delete` appelés directement ou par `npx`, `npm exec` ; la suppression de zone, de domaine ou de projet Pages (`DELETE` sur `/zones`, `/domain`, `/pages/projects`) ; les chemins OVH de transfert, `authInfo`, `lockStatus`, owner et contacts ; le push forcé (`--force`, `-f` ; `--force-with-lease` reste admis) ; tout push vers `main` ; `gh pr merge --admin` et `-R`/`--repo` placé avant `pr` ; `gh pr ready`, même avec `-R`/`--repo` (les PR en brouillon du groupe B de #198 ne passent jamais en « ready » par l'assistant, #199) ; `gh api` en écriture (`-X`, `--method`, `-f`, `-F`, `--field`, `--input`) ; `gh repo edit|delete|rename|archive`, `gh secret` et `gh variable set|delete`. `Edit` et `Write` sont refusés sur `package-lock.json`, `.terraform.lock.hcl` et `CHANGELOG.md`.
- **Retirées des `deny` (#181), gardées dans du code testé** : `npm run infra:tf|infra:identity|infra:registrar -- apply <fichier>.tfplan` (`scripts/lib/tf-args.mjs` : pas d'`apply` sans plan `*.tfplan`, pas de destruction, et refus d'un plan qui détruit ou remplace une ressource, lu par `tofu show -json` sans rien afficher ; tests `scripts/infra-tf-plan-guard.test.mjs`, `scripts/infra-tf-plan-commands.test.mjs`) ; `npm run infra:identity-push` ; les scripts npm de déploiement (Worker, Pages) ; `gh pr merge` vers `main` depuis `develop` ou release-please (hook ci-dessus). PowerShell est absent du poste macOS : ses règles sont testées par motif seulement.
- Limite documentée par Claude Code : une règle `deny` ne lit que le texte de la commande (`bash -c "…"` ou un chemin complet passe). Ces règles évitent les accidents ; elles ne sont pas une frontière de sécurité.

Recommandations de `claude-code-setup` écartées : formatage Prettier après chaque édition (lint-staged le fait déjà au commit ; réécrire le fichier derrière l'outil d'édition crée des états périmés), lint ou tests après chaque édition (Vitest prend environ 24 s).

## Installation et désinstallation

```
/plugin marketplace add addyosmani/web-quality-skills
/plugin install web-quality-skills@addy-web-quality-skills
/plugin marketplace add trailofbits/skills
/plugin install git-cleanup@trailofbits
```

Désinstaller : `claude plugin uninstall <plugin>@<marketplace>` ; retirer une marketplace : `claude plugin marketplace remove <marketplace>` ; désactiver dans ce seul dépôt : `claude plugin disable <plugin>@<marketplace> --scope local`.
