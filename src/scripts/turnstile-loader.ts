/**
 * Turnstile (Cloudflare) chargé à la demande depuis son URL exacte (ni proxy ni cache), puis rendu
 * explicitement. Rien n'est chargé tant que le visiteur n'a pas commencé à remplir le formulaire.
 */
interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  getResponse(widgetId: string): string | undefined;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Widget prêt : jeton courant (vide tant que la vérification n'a pas abouti) et remise à zéro. */
export interface Widget {
  token(): string;
  reset(): void;
}

const loadScript = (src: string): Promise<TurnstileApi> =>
  new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')),
    );
    script.addEventListener('error', () => reject(new Error('turnstile')));
    document.head.append(script);
  });

export async function startTurnstile(
  src: string,
  container: HTMLElement,
  options: { sitekey: string; language: string },
): Promise<Widget> {
  const api = await loadScript(src);
  // `interaction-only` : le widget ne s'affiche que si Cloudflare demande une action au visiteur.
  const id = api.render(container, {
    ...options,
    appearance: 'interaction-only',
    size: 'flexible',
    theme: 'auto',
  });
  return { token: () => api.getResponse(id) ?? '', reset: () => api.reset(id) };
}
