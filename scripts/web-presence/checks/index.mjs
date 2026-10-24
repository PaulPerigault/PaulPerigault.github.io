// Registre des vérifications. Chacune est un module indépendant (`id`, `title`, `run(ctx)`) :
// en retirer une, c'est retirer sa ligne ici et son fichier, sans toucher aux autres.
import * as bing from './bing.mjs';
import * as dnsEmail from './dns-email.mjs';
import * as dnsZone from './dns-zone.mjs';
import * as indexnow from './indexnow.mjs';
import * as links from './links.mjs';
import * as pagespeed from './pagespeed.mjs';
import * as redirects from './redirects.mjs';
import * as searchConsole from './search-console.mjs';
import * as securityHeaders from './security-headers.mjs';
import * as seoTags from './seo-tags.mjs';
import * as siteFiles from './site-files.mjs';
import * as structuredData from './structured-data.mjs';
import * as tls from './tls.mjs';
import * as webVitals from './web-vitals.mjs';

/** Ordre du rapport : le site lui-même, la sécurité, le DNS, puis les consoles Google et Bing. */
export const CHECKS = [
  siteFiles,
  redirects,
  seoTags,
  structuredData,
  links,
  securityHeaders,
  tls,
  dnsEmail,
  dnsZone,
  indexnow,
  searchConsole,
  bing,
  webVitals,
  pagespeed,
];
