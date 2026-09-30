/**
 * Script inline exécuté avant le premier rendu :
 * - marque <html class="js"> (améliorations progressives : le menu mobile n'existe qu'avec JS) ;
 * - applique le thème choisi par le visiteur. Sans choix stocké, `color-scheme: light dark`
 *   (tokens.css) suit le système — aucun JS requis.
 * Chaîne (et non fonction) car elle est injectée telle quelle dans le <head>, puis hachée pour la CSP.
 */
export const HEAD_INIT_SCRIPT =
  "document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";
