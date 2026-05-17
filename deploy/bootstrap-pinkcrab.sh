#!/usr/bin/env bash
# One-time bootstrap that converts pinkcrab.ru from old landing to the annekedisi blog.
# Run remotely from your workstation:
#   ssh seldegram@72.56.12.105 'sudo bash -s' < deploy/bootstrap-pinkcrab.sh
#
# Steps:
#   1. Archives /var/www/landing → /var/backups/pinkcrab-landing/landing-<ts>.tar.gz
#   2. Archives the current nginx vhost
#   3. Replaces the vhost with a Next.js-friendly config (keeps existing certbot TLS)
#   4. Empties /var/www/landing and re-owns it to seldegram:www-data
#   5. Drops a temporary placeholder so the site doesn't 404 before first deploy
#   6. Reloads nginx
#
# After running, the site replies with the placeholder until GitHub Actions
# rsyncs the static export.

set -euo pipefail

DOMAIN="pinkcrab.ru"
ROOT="/var/www/landing"
DEPLOY_USER="seldegram"
BACKUP_DIR="/var/backups/pinkcrab-landing"
VHOST_SRC="/etc/nginx/sites-available/${DOMAIN}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

echo "==> Backups → ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

if [ -d "${ROOT}" ] && [ -n "$(ls -A "${ROOT}" 2>/dev/null || true)" ]; then
    archive="${BACKUP_DIR}/landing-${TS}.tar.gz"
    tar -C "${ROOT}" -czf "${archive}" .
    echo "    ${archive} ($(du -sh "${archive}" | cut -f1))"
else
    echo "    ${ROOT} is empty — nothing to archive"
fi

if [ -f "${VHOST_SRC}" ]; then
    cp -a "${VHOST_SRC}" "${BACKUP_DIR}/nginx-${DOMAIN}-${TS}.conf"
    echo "    nginx-${DOMAIN}-${TS}.conf"
fi

echo "==> Writing new nginx vhost"
cat > "${VHOST_SRC}" <<'NGINX'
server {
    server_name pinkcrab.ru www.pinkcrab.ru;

    root /var/www/landing;
    index index.html;

    # Long cache for hashed Next.js bundles
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~* \.(?:css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico)$ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ $uri.html $uri/index.html =404;
        add_header Cache-Control "public, max-age=300, must-revalidate";
    }

    error_page 404 /404.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml application/rss+xml text/javascript image/svg+xml;
    gzip_min_length 1024;

    # Existing certbot block — keep
    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/pinkcrab.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pinkcrab.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.pinkcrab.ru) { return 301 https://$host$request_uri; }
    if ($host = pinkcrab.ru)     { return 301 https://$host$request_uri; }

    listen 80;
    listen [::]:80;
    server_name pinkcrab.ru www.pinkcrab.ru;
    return 404;
}
NGINX

echo "==> Validating nginx config"
nginx -t

echo "==> Clearing ${ROOT} and chowning to ${DEPLOY_USER}:www-data"
# Use find so the rm cannot accidentally escape the dir
find "${ROOT}" -mindepth 1 -delete
chown -R "${DEPLOY_USER}:www-data" "${ROOT}"
chmod 755 "${ROOT}"

echo "==> Placeholder page"
cat > "${ROOT}/index.html" <<'HTML'
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>pinkcrab.ru</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#fafaf9;color:#1c1917;display:grid;place-items:center;min-height:100vh;margin:0}
    main{text-align:center;padding:2rem}
    h1{font-size:2rem;margin:0 0 .5rem}
    p{color:#78716c;margin:0}
  </style>
</head>
<body><main>
  <h1>pinkcrab.ru</h1>
  <p>Сайт обновляется — деплой идёт.</p>
</main></body>
</html>
HTML
chown "${DEPLOY_USER}:www-data" "${ROOT}/index.html"

echo "==> Reloading nginx"
systemctl reload nginx

echo ""
echo "==> Done."
echo "    Old landing archive:    ${BACKUP_DIR}/landing-${TS}.tar.gz"
echo "    Old nginx config:       ${BACKUP_DIR}/nginx-${DOMAIN}-${TS}.conf"
echo "    Current owner of root:  $(stat -c '%U:%G' "${ROOT}")"
echo ""
echo "To download the landing backup:"
echo "    scp seldegram@72.56.12.105:${BACKUP_DIR}/landing-${TS}.tar.gz ./"
