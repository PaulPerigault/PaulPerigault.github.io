// Contrôles du site réellement en ligne : redirections, HTTPS, fichiers d'indexation, en-têtes.
// Pur et déclaratif : `runChecks` reçoit un `fetch`, ce qui permet de le tester sans réseau.

const SECURITY_HEADERS = [
  ['strict-transport-security', /max-age=\d{7,}/],
  ['x-content-type-options', /^nosniff$/i],
  ['referrer-policy', /.+/],
  ['permissions-policy', /.+/],
  ['content-security-policy', /frame-ancestors\s+'none'/],
];

const isRedirect = (res, to) =>
  res.status === 301 && res.headers.get('location') === to ? null : `attendu 301 → ${to}`;

const robotsProblem = (body) => {
  if (!body.includes('sitemap-index.xml')) return 'sitemap absent';
  return /^\s*(Disallow:\s*\S|Content-Signal)/im.test(body)
    ? 'robots.txt modifié (Disallow / Content-Signal)'
    : null;
};

const status = (res, expected) => (res.status === expected ? null : `statut ${res.status}`);

const headerProblems = (res) =>
  SECURITY_HEADERS.filter(([name, pattern]) => !pattern.test(res.headers.get(name) ?? '')).map(
    ([name]) => `en-tête manquant ou invalide : ${name}`,
  );

const redirects = ({ domain, alias }) => {
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

const files = (site) => [
  {
    name: 'robots.txt',
    url: `${site}/robots.txt`,
    test: (r, body) => status(r, 200) ?? robotsProblem(body),
  },
  { name: 'sitemap', url: `${site}/sitemap-index.xml`, test: (r) => status(r, 200) },
  { name: 'llms.txt', url: `${site}/llms.txt`, test: (r) => status(r, 200) },
  { name: 'security.txt', url: `${site}/.well-known/security.txt`, test: (r) => status(r, 200) },
  { name: '404 réel', url: `${site}/introuvable/`, test: (r) => status(r, 404) },
];

/** @param {{ domain: string, alias: string }} sites */
export const buildChecks = (sites) => {
  const site = `https://${sites.domain}`;
  return [
    ...redirects(sites),
    { name: 'page FR', url: `${site}/fr/`, test: (r) => status(r, 200) },
    { name: 'page EN', url: `${site}/en/`, test: (r) => status(r, 200) },
    {
      name: 'en-têtes de sécurité',
      url: `${site}/fr/`,
      test: (r) => headerProblems(r)[0] ?? null,
      all: headerProblems,
    },
    ...crawlers(site),
    ...files(site),
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
