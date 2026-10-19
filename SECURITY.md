# Politique de sécurité

## Signaler une vulnérabilité

Écrire à **contact@paulperigault.fr** (même contact que [`/.well-known/security.txt`](https://paulperigault.fr/.well-known/security.txt), RFC 9116), en français ou en anglais, sans ouvrir d'issue publique. Réponse sous 7 jours ; correctif publié dès que possible, avec mention du signalement si vous le souhaitez.

## Périmètre

- le site statique `paulperigault.fr` (ce dépôt) ;
- le Worker du formulaire de contact (`worker/`, `contact.paulperigault.dev`) ;
- l'infrastructure décrite dans `infra/` et les workflows `.github/workflows/`.

Hors périmètre : déni de service volumétrique, résultats d'outils automatiques sans démonstration d'impact, services tiers (GitHub, Cloudflare, Resend, OVH).

## Versions prises en charge

Seule la version en production (branche `main`) est maintenue.
