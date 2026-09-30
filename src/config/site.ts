/** Identité du site : source unique des noms, URLs et coordonnées (aucune URL en dur ailleurs). */
const GITHUB_USER = 'PaulPerigault';

export const SITE = {
  name: 'Paul Perigault',
  brand: 'paul@perigault',
  domain: 'https://paulperigault.fr',
  email: 'contact@paulperigault.fr',
  githubUser: GITHUB_USER,
  githubApiUrl: 'https://api.github.com',
  githubUrl: `https://github.com/${GITHUB_USER}`,
  linkedinUrl: 'https://www.linkedin.com/in/paul-perigault',
  cvUrl: 'https://raw.githubusercontent.com/PaulPerigault/cv-latex/main/out/main.pdf',
} as const;
