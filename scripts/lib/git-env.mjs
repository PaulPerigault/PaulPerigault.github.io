// Environnement d'un `git` lancé dans un dossier précis : sans les variables GIT_* héritées.
// Un hook Git (pre-push → `npm run verify`) exporte `GIT_DIR` ; depuis un worktree il est absolu,
// et un `git init`/`commit` lancé dans un dossier temporaire écrirait alors dans le vrai dépôt
// (commits parasites sur la branche, `core.bare=true` dans la configuration commune).

/** @param {NodeJS.ProcessEnv} env @returns {NodeJS.ProcessEnv} */
export const withoutGitEnv = (env = process.env) =>
  Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('GIT_')));
