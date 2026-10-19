// Préalable à HSTS `includeSubDomains; preload` (#210) : chaque sous-domaine de paulperigault.fr
// qui existe doit répondre en HTTPS, car le navigateur refusera ensuite tout HTTP sur la zone
// entière, pour des mois. Lecture seule (DNS public 1.1.1.1, requêtes HEAD) :
//   npm run check:hsts      code 1 si un sous-domaine existant n'a pas de HTTPS valide
import { Resolver } from 'node:dns/promises';

const ZONE = 'paulperigault.fr';
// Noms courants (site, messagerie, configuration automatique, services) ; la messagerie iCloud (MX)
// ne passe pas par HTTP. Ajouter ici tout nouveau sous-domaine avant de le créer.
const CANDIDATES = ['www', 'mail', 'webmail', 'smtp', 'imap', 'autoconfig', 'autodiscover', 'api'];
const TIMEOUT_MS = 10_000;

const exists = async (resolver, name) => {
  try {
    return (await resolver.resolve4(name)).length > 0;
  } catch {
    return false;
  }
};

const httpsProblem = async (fetchFn, name) => {
  try {
    await fetchFn(`https://${name}/`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return null;
  } catch (error) {
    return `pas de HTTPS (${error.cause?.code ?? error.message})`;
  }
};

/** @returns {Promise<number>} code de sortie */
export async function checkHsts({ resolver, fetch: fetchFn, log }) {
  let failed = 0;
  for (const name of CANDIDATES.map((sub) => `${sub}.${ZONE}`)) {
    if (!(await exists(resolver, name))) {
      log(`--   ${name} : absent du DNS`);
      continue;
    }
    const problem = await httpsProblem(fetchFn, name);
    if (problem) failed += 1;
    log(problem ? `FAIL ${name} : ${problem}` : `OK   ${name} : HTTPS`);
  }
  return failed === 0 ? 0 : 1;
}

if (import.meta.main) {
  const resolver = new Resolver();
  resolver.setServers(['1.1.1.1', '1.0.0.1']);
  process.exitCode = await checkHsts({
    resolver,
    fetch: globalThis.fetch,
    log: (l) => console.log(l),
  });
}
