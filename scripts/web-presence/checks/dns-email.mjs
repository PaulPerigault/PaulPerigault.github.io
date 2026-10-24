// Messagerie : SPF, DKIM et DMARC des domaines qui reçoivent ou envoient du courrier. `.fr` reçoit
// par iCloud (SPF iCloud, DKIM `sig1`), `.dev` envoie par Resend (SPF et DKIM propres à Resend,
// SPF sur le sous-domaine `send`). Le DMARC est exigé sur les deux (anti-usurpation).
import { cnameRecords, txtRecords } from '../lib/dns-lookup.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'dns-email';
export const title = 'DNS messagerie : SPF, DKIM, DMARC';

/** @returns {{ domain: string, spfHost: string, spfInclude?: string, dkim: string }[]} */
export const policies = (ctx) => [
  { domain: ctx.domain, spfHost: ctx.domain, spfInclude: 'include:icloud.com', dkim: 'sig1' },
  { domain: ctx.alias, spfHost: `send.${ctx.alias}`, dkim: 'resend' },
];

/** @returns {string[]} problèmes d'un jeu d'enregistrements SPF */
export const spfProblems = (records, include) => {
  const spf = records.filter((record) => record.startsWith('v=spf1'));
  if (spf.length === 0) return ['aucun enregistrement SPF'];
  if (spf.length > 1) return ['plusieurs enregistrements SPF (invalide, RFC 7208)'];
  const problems = [];
  if (!/\s[~-]all$/.test(spf[0])) problems.push('SPF sans « ~all » ou « -all » final');
  if (include && !spf[0].includes(include)) problems.push(`SPF sans ${include}`);
  return problems;
};

/** @returns {{ problems: string[], notes: string[] }} politique DMARC (p= none, quarantine, reject) */
export const dmarcProblems = (records) => {
  const dmarc = records.find((record) => record.startsWith('v=DMARC1'));
  if (!dmarc) return { problems: ['aucun enregistrement DMARC'], notes: [] };
  const policy = /;\s*p=(none|quarantine|reject)\b/.exec(dmarc)?.[1];
  if (!policy) return { problems: ['DMARC sans politique p= valide'], notes: [] };
  const notes = [`DMARC p=${policy}${/;\s*rua=/.test(dmarc) ? '' : ' (sans rua)'}`];
  return { problems: [], notes };
};

const dkimProblems = async (ctx, domain, selector) => {
  const name = `${selector}._domainkey.${domain}`;
  const [txt, cname] = await Promise.all([txtRecords(ctx, name), cnameRecords(ctx, name)]);
  const key = txt.some((record) => /\bp=[A-Za-z0-9+/=]{20,}/.test(record));
  return key || cname.length > 0 ? [] : [`DKIM ${selector} absent (${name})`];
};

const checkDomain = async (ctx, policy) => {
  const dmarc = dmarcProblems(await txtRecords(ctx, `_dmarc.${policy.domain}`));
  const spf = spfProblems(await txtRecords(ctx, policy.spfHost), policy.spfInclude);
  const dkim = await dkimProblems(ctx, policy.domain, policy.dkim);
  const problems = [...spf, ...dkim, ...dmarc.problems];
  return {
    problems: problems.map((p) => `${policy.domain} : ${p}`),
    notes: dmarc.notes.map((n) => `${policy.domain} : ${n}`),
  };
};

export const run = async (ctx) => {
  const results = await Promise.all(policies(ctx).map((policy) => checkDomain(ctx, policy)));
  return fromProblems(
    results.flatMap((r) => r.problems),
    results.flatMap((r) => r.notes),
  );
};
