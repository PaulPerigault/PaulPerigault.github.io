// Découpage d'une commande Bash ou PowerShell en sous-commandes puis en mots, sans l'exécuter.
// Approximation volontaire (garde-fou contre les accidents) : les séparateurs `;`, `&`, `|`, le saut
// de ligne, les parenthèses et l'accent grave (substitution `$(…)` ou `` `…` ``) coupent la commande,
// sauf entre guillemets simples ou doubles.

const SEPARATOR = /[;&|\n()`]/;
const WORD = /"([^"]*)"|'([^']*)'|(\S+)/g;

/** @param {string} command @returns {string[]} sous-commandes */
export const segmentsOf = (command) => {
  const segments = [];
  let quote = null;
  let start = 0;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote) quote = char === quote ? null : quote;
    else if (char === '"' || char === "'") quote = char;
    else if (SEPARATOR.test(char)) {
      segments.push(command.slice(start, i));
      start = i + 1;
    }
  }
  return [...segments, command.slice(start)];
};

/** @param {string} segment @returns {string[]} mots, guillemets englobants retirés */
export const wordsOf = (segment) => [...segment.matchAll(WORD)].map((m) => m[1] ?? m[2] ?? m[3]);
