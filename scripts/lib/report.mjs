// Sortie commune des garde-fous : chaque problème sur stderr et code 1, sinon une ligne « OK ».

/**
 * @param {string} name nom du contrôle (`check-docs`)
 * @param {string[]} problems messages déjà formatés
 * @param {string} [okMessage] message de succès, `<name>: OK` par défaut
 */
export function reportAndExit(name, problems, okMessage = `${name}: OK`) {
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) process.exit(1);
  console.log(okMessage);
}
