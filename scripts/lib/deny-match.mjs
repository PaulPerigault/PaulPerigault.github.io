// Correspondance d'une commande avec les règles `deny` de .claude/settings.json, selon la règle
// documentée de Claude Code : `*` = n'importe quel texte, motif comparé à la commande entière, ` *`
// final qui accepte aussi la commande nue. Sert aux tests des garde-fous de l'assistant.

const toRegex = (pattern) => {
  const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body.endsWith(' .*') ? `${body.slice(0, -3)}(?: .*)?` : body}$`);
};

/**
 * @param {string[]} deny règles `deny` (`Bash(…)`, `PowerShell(…)`, `Read(…)`…)
 * @param {string} tool outil visé (`Bash` ou `PowerShell`)
 * @param {string} command commande complète
 * @returns {boolean} vrai si une règle de cet outil refuse la commande
 */
export function denied(deny, tool, command) {
  return deny
    .filter((rule) => rule.startsWith(`${tool}(`))
    .some((rule) => toRegex(rule.slice(tool.length + 1, -1)).test(command));
}
