#!/usr/bin/env bash
# Construit l'image, la lance et vérifie les en-têtes de sécurité et les pages servies.
set -euo pipefail

IMAGE=portfolio-check
NAME=portfolio-check
PORT=18080
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

docker build -t "$IMAGE" .
docker run -d --name "$NAME" -p "$PORT:8080" --read-only --tmpfs /tmp --tmpfs /var/cache/nginx "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  curl -fsS "http://127.0.0.1:$PORT/fr/" >/dev/null 2>&1 && break
  sleep 1
done

headers=$(curl -fsSI "http://127.0.0.1:$PORT/fr/")
for expected in \
  "content-security-policy: frame-ancestors 'none'" \
  "x-content-type-options: nosniff" \
  "x-frame-options: DENY" \
  "referrer-policy: strict-origin-when-cross-origin" \
  "cross-origin-opener-policy: same-origin"; do
  echo "$headers" | tr -d '\r' | grep -qi "^$expected" || { echo "En-tête manquant : $expected"; exit 1; }
done
if echo "$headers" | grep -qi "^x-xss-protection"; then echo "X-XSS-Protection obsolète présent"; exit 1; fi
if echo "$headers" | grep -qi "^server: .*/"; then echo "Version du serveur exposée"; exit 1; fi

curl -fsS "http://127.0.0.1:$PORT/en/" | grep -q "content-security-policy"
asset=$(curl -fsS "http://127.0.0.1:$PORT/fr/" | grep -o "/_astro/[^\"]*\.css" | head -1)
curl -fsSI "http://127.0.0.1:$PORT$asset" | tr -d "\r" | grep -qi "^cache-control: max-age=31536000"
curl -fsSI "http://127.0.0.1:$PORT$asset" | tr -d "\r" | grep -qi "^x-content-type-options: nosniff"
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/introuvable/")" = "404" ]
curl -fsSI "http://127.0.0.1:$PORT/en/index.md" | tr -d '\r' | grep -qi "^content-type: text/markdown"
[ "$(docker exec "$NAME" id -u)" != "0" ] || { echo "Le conteneur tourne en root"; exit 1; }
echo "Conteneur OK : en-têtes, pages, 404, Markdown, utilisateur non-root."
