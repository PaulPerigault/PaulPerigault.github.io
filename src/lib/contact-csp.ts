import { SITE } from '@/config/site';

/** Sources CSP qu'ajoute le formulaire de contact, au strict nécessaire. */
const contactFormSources = () => ({
  script: ["'self'", SITE.turnstileOrigin],
  frame: [SITE.turnstileOrigin],
  connect: ["'self'", new URL(SITE.contactEndpoint).origin, SITE.turnstileOrigin],
});

/** Sous-ensemble de `Astro.csp` utilisé ici (syntaxe de méthode : accepte l'API typée d'Astro). */
interface CspApi {
  insertScriptResource(resource: string): void;
  insertDirective(directive: string): void;
}

/**
 * Ouvre la CSP de la page pour le formulaire : Worker (`connect-src`) et Turnstile (script, iframe,
 * connexions). À appeler dans le frontmatter de la **page** : la balise `<meta>` est produite avec
 * le `<head>`, avant le rendu des composants du `<body>`. `insertScriptResource` remplace la
 * source par défaut, d'où `'self'` redonné explicitement.
 */
export function allowContactForm(csp: CspApi | undefined): void {
  const { script, frame, connect } = contactFormSources();
  for (const resource of script) csp?.insertScriptResource(resource);
  csp?.insertDirective(`frame-src ${frame.join(' ')}`);
  csp?.insertDirective(`connect-src ${connect.join(' ')}`);
}
