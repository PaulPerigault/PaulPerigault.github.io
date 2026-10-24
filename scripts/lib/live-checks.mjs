// Contrôles du site réellement en ligne : redirections, HTTPS, fichiers d'indexation, en-têtes.
// Pur et déclaratif : `runChecks` reçoit un `fetch`, ce qui permet de le tester sans réseau.

const isRedirect = (res, to) =>
  res.status === 301 && res.headers.get('location') === to ? null : `attendu 301 → ${to}`;

export const robotsProblem = (body) => {
  if (!body.includes('sitemap-index.xml')) return 'sitemap absent';
  return /^\s*(Disallow:\s*\S|Content-Signal)/im.test(body)
    ? 'robots.txt modifié (Disallow / Content-Signal)'
    : null;
};

const status = (res, expected) => (res.status === expected ? null : `statut ${res.status}`);

// security.txt doit rester valide au moins 30 jours (même seuil que e2e/geo-files.spec.ts).
const MIN_VALIDITY_MS = 30 * 86_400_000;

/** RFC 9116 : `Contact` présent, `Expires` lisible et à plus de 30 jours de `now`. */
export const securityTxtProblem = (body, now) => {
  if (!/^Contact: \S+/m.test(body)) return 'champ Contact absent';
  const expires = Date.parse(/^Expires: (.+)$/m.exec(body)?.[1] ?? '');
  if (Number.isNaN(expires)) return 'champ Expires absent ou illisible';
  return expires - now < MIN_VALIDITY_MS ? 'Expires à moins de 30 jours' : null;
};

/** En-têtes attendus (valeurs exactes de public/_headers, `expected-headers.mjs`). */
const headerProblems = (expected) => (res) =>
  [...expected]
    .filter(([name, value]) => res.headers.get(name) !== value)
    .map(([name]) => `en-tête manquant ou différent de public/_headers : ${name}`);

export const redirects = ({ domain, alias }) => {
  const site = `https://${domain}`;
  const to = (path) => (r) => isRedirect(r, `${site}${path}`);
  return [
    { name: 'HTTP → HTTPS', url: `http://${domain}/fr/`, test: to('/fr/') },
    { name: 'www → domaine canonique', url: `https://www.${domain}/fr/`, test: to('/fr/') },
    {
      name: `${alias} → ${domain} (301, chemin conservé)`,
      url: `https://${alias}/en/?a=1`,
      test: to('/en/?a=1'),
    },
    { name: `www.${alias} → ${domain}`, url: `https://www.${alias}/fr/`, test: to('/fr/') },
  ];
};

const crawlers = (site) =>
  ['GPTBot', 'ClaudeBot', 'PerplexityBot'].map((bot) => ({
    name: `${bot} n'est pas bloqué`,
    url: `${site}/fr/`,
    headers: { 'user-agent': `Mozilla/5.0 (compatible; ${bot}/1.0)` },
    test: (r) => status(r, 200),
  }));

const files = (site, now) => [
  {
    name: 'robots.txt',
    url: `${site}/robots.txt`,
    test: (r, body) => status(r, 200) ?? robotsProblem(body),
  },
  { name: 'sitemap', url: `${site}/sitemap-index.xml`, test: (r) => status(r, 200) },
  { name: 'llms.txt', url: `${site}/llms.txt`, test: (r) => status(r, 200) },
  {
    name: 'security.txt (/.well-known/, fait foi)',
    url: `${site}/.well-known/security.txt`,
    test: (r, body) => status(r, 200) ?? securityTxtProblem(body, now),
  },
  {
    name: 'security.txt (copie à la racine)',
    url: `${site}/security.txt`,
    test: (r) => status(r, 200),
  },
  { name: '404 réel', url: `${site}/introuvable/`, test: (r) => status(r, 404) },
];

/**
 * @param {{ domain: string, alias: string, expectedHeaders: Map<string, string> }} sites
 * @param {number} [now] instant de référence (ms), injectable pour les tests
 */
export const buildChecks = (sites, now = Date.now()) => {
  const site = `https://${sites.domain}`;
  const securityProblems = headerProblems(sites.expectedHeaders);
  return [
    ...redirects(sites),
    { name: 'page FR', url: `${site}/fr/`, test: (r) => status(r, 200) },
    { name: 'page EN', url: `${site}/en/`, test: (r) => status(r, 200) },
    {
      name: 'en-têtes de sécurité',
      url: `${site}/fr/`,
      test: (r) => securityProblems(r)[0] ?? null,
      all: securityProblems,
    },
    ...crawlers(site),
    ...files(site, now),
  ];
};

/** Exécute chaque contrôle ; une erreur réseau devient un échec, jamais une exception. */
export const runChecks = async (checks, fetchFn) =>
  Promise.all(
    checks.map(async ({ name, url, test, all, headers }) => {
      try {
        const res = await fetchFn(url, { redirect: 'manual', headers });
        const problems = all ? all(res) : [test(res, await res.text())].filter(Boolean);
        return { name, url, problems };
      } catch (error) {
        return { name, url, problems: [`injoignable : ${error.cause?.code ?? error.message}`] };
      }
    }),
  );
