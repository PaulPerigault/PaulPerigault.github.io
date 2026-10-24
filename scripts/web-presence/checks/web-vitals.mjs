// Core Web Vitals RÉELS (visiteurs Chrome, 28 jours glissants) de l'origine, mobile d'abord, via la
// CrUX API. Seuils « bon » de web.dev au 75e centile. Un site peu visité n'a parfois pas de
// données : c'est un avertissement, jamais un échec.
import { apiKey, CRUX, googleJson } from '../lib/google.mjs';
import { fail, fromProblems, skipped, warn } from '../lib/result.mjs';

export const id = 'web-vitals';
export const title = 'Core Web Vitals réels (CrUX, mobile)';

/** Seuils « bon » au 75e centile : LCP et INP en ms, CLS sans unité. */
export const THRESHOLDS = {
  largest_contentful_paint: { label: 'LCP', good: 2500, unit: ' ms' },
  interaction_to_next_paint: { label: 'INP', good: 200, unit: ' ms' },
  cumulative_layout_shift: { label: 'CLS', good: 0.1, unit: '' },
};

const NOT_CONFIGURED = 'GOOGLE_API_KEY absent : clé CrUX/PageSpeed non configurée';
const NO_DATA = 'pas assez de visiteurs Chrome pour publier des données CrUX';

/** @returns {{ problems: string[], notes: string[] }} lecture des métriques d'un enregistrement */
export const judge = (metrics, formFactor) => {
  const problems = [];
  const notes = [];
  for (const [name, { label, good, unit }] of Object.entries(THRESHOLDS)) {
    const p75 = Number(metrics?.[name]?.percentiles?.p75);
    if (Number.isNaN(p75)) continue;
    notes.push(`${formFactor} ${label} p75 = ${p75}${unit}`);
    if (p75 > good) problems.push(`${formFactor} ${label} p75 = ${p75}${unit} (> ${good}${unit})`);
  }
  return { problems, notes };
};

const query = (ctx, formFactor) =>
  googleJson(ctx, CRUX, {
    headers: apiKey(ctx.secrets.googleApiKey),
    body: { origin: ctx.origin, formFactor, metrics: Object.keys(THRESHOLDS) },
  });

/** Le bureau est informatif : une erreur ou l'absence de données n'ajoute rien au rapport. */
const desktopNotes = (desktop) =>
  desktop.error ? [] : judge(desktop.data?.record?.metrics, 'desktop').notes;

export const run = async (ctx) => {
  if (!ctx.secrets.googleApiKey) return skipped(NOT_CONFIGURED);
  const [phone, desktop] = await Promise.all([query(ctx, 'PHONE'), query(ctx, 'DESKTOP')]);
  if (phone.status === 404) return warn([NO_DATA]);
  if (phone.error) return fail([`CrUX mobile : ${phone.error}`]);
  const mobile = judge(phone.data?.record?.metrics, 'mobile');
  return fromProblems(mobile.problems, [...mobile.notes, ...desktopNotes(desktop)]);
};
