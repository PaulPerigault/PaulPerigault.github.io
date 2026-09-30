/**
 * Script inline de la racine `/` : envoie vers la langue mémorisée, sinon celle du navigateur,
 * sinon le français. Sans JavaScript, la balise meta refresh de la page mène à `/fr/`.
 */
export const ROOT_REDIRECT_SCRIPT =
  "try{var s=localStorage.getItem('lang');var n=(navigator.languages&&navigator.languages[0])||navigator.language||'fr';var l=s==='fr'||s==='en'?s:n.slice(0,2)==='en'?'en':'fr';location.replace('/'+l+'/')}catch(e){location.replace('/fr/')}";
