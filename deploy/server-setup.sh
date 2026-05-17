#!/usr/bin/env bash
# One-time server setup for annekedisi.pinkcrab.ru on 72.56.12.105.
# Run as root.
#
#   curl -sS https://raw.githubusercontent.com/sereganikitin/annekedisi/main/deploy/server-setup.sh | sudo bash
#
# Or:  scp deploy/server-setup.sh root@72.56.12.105:/tmp/ && ssh root@... bash /tmp/server-setup.sh

set -euo pipefail

DOMAIN="annekedisi.pinkcrab.ru"
DEPLOY_USER="annekedisi"
DEPLOY_DIR="/var/www/${DOMAIN}"

echo "==> Installing nginx + rsync + certbot"
apt-get update -qq
apt-get install -y nginx rsync certbot python3-certbot-nginx

echo "==> Creating deploy user '${DEPLOY_USER}'"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "${DEPLOY_USER}"
fi

echo "==> Preparing web root ${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}"
chown -R "${DEPLOY_USER}:www-data" "${DEPLOY_DIR}"
chmod 755 "${DEPLOY_DIR}"

# nginx config
echo "==> Installing nginx site"
cat > "/etc/nginx/sites-available/${DOMAIN}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name annekedisi.pinkcrab.ru;

    root /var/www/annekedisi.pinkcrab.ru;
    index index.html;

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
}
NGINX

ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t
systemctl reload nginx

# Placeholder index so the site responds on first hit
if [ ! -f "${DEPLOY_DIR}/index.html" ]; then
    cat > "${DEPLOY_DIR}/index.html" <<'HTML'
<!doctype html>
<html><head><meta charset=utf-8><title>annekedisi.pinkcrab.ru</title></head>
<body><h1>annekedisi.pinkcrab.ru</h1>
<p>Setup OK — waiting for first deploy from GitHub Actions.</p></body></html>
HTML
    chown "${DEPLOY_USER}:www-data" "${DEPLOY_DIR}/index.html"
fi

# Deploy SSH key — if /tmp/deploy_key.pub is provided, install it
if [ -f /tmp/deploy_key.pub ]; then
    echo "==> Installing deploy SSH key for ${DEPLOY_USER}"
    install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
    cat /tmp/deploy_key.pub >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

echo ""
echo "==> Done. Next steps:"
echo "  1. Point DNS A record annekedisi.pinkcrab.ru → 72.56.12.105 (likely already)"
echo "  2. After DNS propagates: certbot --nginx -d ${DOMAIN}"
echo "  3. Add the GitHub Actions deploy key to ${DEPLOY_USER}@${HOSTNAME}:/home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "  4. Set GitHub repo secrets: DEPLOY_HOST=72.56.12.105 DEPLOY_USER=${DEPLOY_USER} DEPLOY_PATH=${DEPLOY_DIR} DEPLOY_SSH_KEY=<private key>"
