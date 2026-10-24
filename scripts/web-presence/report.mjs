// Rapport Markdown du contrôle : résumé, tableau, puis le détail des échecs, avertissements et
// vérifications non configurées. Aucun secret n'y entre : les vérifications ne les écrivent pas.

const LABEL = { ok: 'OK', fail: 'ÉCHEC', warn: 'AVERTISSEMENT', skipped: 'NON CONFIGURÉ' };
const count = (results, status) => results.filter((r) => r.status === status).length;

/** @returns {boolean} vrai si au moins une vérification est en échec */
export const hasFailure = (results) => results.some((r) => r.status === 'fail');

const PLURAL = {
  fail: 'échec(s)',
  warn: 'avertissement(s)',
  skipped: 'non configuré(s)',
  ok: 'réussi(s)',
};

const summary = (results) => {
  const parts = Object.entries(PLURAL).map(
    ([status, label]) => `${count(results, status)} ${label}`,
  );
  return `${hasFailure(results) ? 'ÉCHEC' : 'Réussi'} : ${parts.join(', ')}`;
};

const cell = (text) => text.replaceAll('|', '\\|').replaceAll('\n', ' ');

const detail = (result) => {
  const first = result.problems[0] ?? result.notes[0] ?? '';
  const more = result.problems.length > 1 ? ` (+${result.problems.length - 1})` : '';
  return cell(`${first}${more}`);
};

const section = (heading, results, lines) =>
  results.length === 0
    ? []
    : [
        `## ${heading}`,
        '',
        ...results.flatMap((r) => [`### ${r.title} (\`${r.id}\`)`, '', ...lines(r), '']),
      ];

/**
 * @param {{ id: string, title: string, status: string, problems: string[], notes: string[] }[]} results
 * @param {{ origin: string, date: Date }} meta
 */
export const renderReport = (results, { origin, date }) =>
  [
    `# Présence en ligne de ${origin}`,
    '',
    `Contrôle du ${date.toISOString().slice(0, 10)} à ${date.toISOString().slice(11, 16)} UTC. ${summary(results)}.`,
    '',
    '| Vérification | Statut | Détail |',
    '| --- | --- | --- |',
    ...results.map((r) => `| ${r.title} | ${LABEL[r.status]} | ${detail(r)} |`),
    '',
    ...section(
      'Échecs',
      results.filter((r) => r.status === 'fail'),
      (r) => [...r.problems.map((p) => `- ${p}`), ...r.notes.map((n) => `- (${n})`)],
    ),
    ...section(
      'Avertissements',
      results.filter((r) => r.status === 'warn'),
      (r) => r.notes.map((n) => `- ${n}`),
    ),
    ...section(
      'Non configuré',
      results.filter((r) => r.status === 'skipped'),
      (r) => r.notes.map((n) => `- ${n}`),
    ),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n';
