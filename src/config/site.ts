/** Identité du site : source unique des noms, URLs et coordonnées (aucune URL en dur ailleurs). */
const GITHUB_USER = 'PaulPerigault';
const DOMAIN = 'https://paulperigault.fr';
const CV_PATH = '/cv-paul-perigault.pdf';

export const SITE = {
  name: 'Paul Perigault',
  domain: DOMAIN,
  email: 'contact@paulperigault.fr',
  githubUser: GITHUB_USER,
  employer: 'WeVii',
  schools: ['ESIEA Paris', 'IUT Paris Rives de Seine'],
  ogImagePath: '/image/og-cover.png',
  githubApiUrl: 'https://api.github.com',
  githubUrl: `https://github.com/${GITHUB_USER}`,
  linkedinUrl: 'https://www.linkedin.com/in/paul-perigault',
  /** CV servi par le site (copié au build par `scripts/fetch-cv.mjs`). */
  cvPath: CV_PATH,
  cvUrl: `${DOMAIN}${CV_PATH}`,
  /** Worker du formulaire de contact (`worker/`), appelé par `fetch` depuis le navigateur. */
  contactEndpoint: 'https://contact.paulperigault.dev/',
  /** Origine de Turnstile : script, iframe et connexions du widget anti-robot (CSP). */
  turnstileOrigin: 'https://challenges.cloudflare.com',
  /** URL exacte imposée par Cloudflare (ni proxy ni cache), chargée au premier focus du formulaire. */
  turnstileScriptUrl: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
} as const;
