// Exécute les vérifications, chacune isolée : une exception d'une vérification devient un échec
// de CETTE vérification, jamais l'arrêt des autres.

/**
 * @param {ReturnType<typeof import('./context.mjs').createContext>} ctx
 * @param {{ id: string, title: string, run: (ctx: object) => Promise<object> }[]} checks
 * @returns {Promise<{ id: string, title: string, status: string, problems: string[], notes: string[], ms: number }[]>}
 */
export const executeChecks = (ctx, checks) =>
  Promise.all(
    checks.map(async ({ id, title, run }) => {
      const start = ctx.now();
      try {
        const outcome = await run(ctx);
        return { id, title, ...outcome, ms: ctx.now() - start };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return {
          id,
          title,
          status: 'fail',
          problems: [`erreur inattendue : ${reason}`],
          notes: [],
          ms: ctx.now() - start,
        };
      }
    }),
  );

/** Sélection par `--only=a,b` ; un identifiant inconnu est une erreur de saisie, pas un oubli. */
export const selectChecks = (all, only) => {
  if (!only) return all;
  const wanted = only
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const unknown = wanted.filter((id) => !all.some((check) => check.id === id));
  if (unknown.length > 0) {
    throw new Error(
      `Vérification inconnue : ${unknown.join(', ')} (connues : ${all.map((c) => c.id).join(', ')})`,
    );
  }
  return all.filter((check) => wanted.includes(check.id));
};
