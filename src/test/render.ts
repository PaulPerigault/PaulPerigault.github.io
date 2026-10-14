import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

const DEV_ATTRIBUTES = / data-astro-source-(?:file|loc)="[^"]*"/g;

type Options = { props?: Record<string, unknown>; slot?: string; url?: string };

/**
 * Rend un composant Astro en HTML (Container API) avec ses props, son slot par défaut et, si
 * besoin, l'URL de la page (`Astro.url`).
 */
export const render = async (
  component: AstroComponentFactory,
  { props = {}, slot = '', url }: Options = {},
): Promise<string> => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, {
    props,
    slots: { default: slot },
    ...(url === undefined ? {} : { request: new Request(url) }),
  });
  return html.replace(DEV_ATTRIBUTES, '');
};
