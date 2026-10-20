// Ancien hébergement : après le renommage du dépôt en `portfolio` et la désactivation de GitHub
// Pages, `paulperigault.github.io` ne doit plus rien servir (ni copie du site, ni redirection).

/** @param {string | undefined} host ancien hôte, ou rien (contrôle omis) */
export const retiredHostChecks = (host) =>
  host
    ? [
        {
          name: `${host} ne sert plus rien (404)`,
          url: `https://${host}/`,
          test: (res) => (res.status === 404 ? null : `statut ${res.status}`),
        },
      ]
    : [];
