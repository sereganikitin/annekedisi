#!/usr/bin/env bash
# One-time server setup for pinkcrab.ru on 72.56.12.105.
# Run as root:
#   scp deploy/server-setup.sh root@72.56.12.105:/tmp/
#   ssh root@72.56.12.105 'bash /tmp/server-setup.sh'
#
# Optional, but recommended: first put the deploy public key at /tmp/deploy_key.pub
# so the script installs it for the deploy user automatically.

set -euo pipefail

DOMAIN="pinkcrab.ru"
DEPLOY_USER="annekedisi"
DEPLOY_DIR="/var/www/${DOMAIN}"
BACKUP_DIR="/var/backups/pinkcrab.ru-old"

echo "==> Installing nginx + rsync + certbot"
apt-get update -qq
apt-get install -y nginx rsync certbot python3-certbot-nginx tar

echo "==> Creating deploy user '${DEPLOY_USER}'"
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "${DEPLOY_USER}"
fi

echo "==> Backing up existing landing (if present)"
if [ -d "${DEPLOY_DIR}" ] && [ "$(ls -A "${DEPLOY_DIR}" 2>/dev/null)" ]; then
    mkdir -p "${BACKUP_DIR}"
    ts="$(date -u +%Y%m%dT%H%M%SZ)"
    archive="${BACKUP_DIR}/landing-${ts}.tar.gz"
    tar -C "${DEPLOY_DIR}" -czf "${archive}" .
    echo "    archived old landing → ${archive}"
    echo "    contents preserved; download with:"
    echo "      scp root@72.56.12.105:${archive} ./"
    # Move the live directory aside so nothing under it leaks to the new site
    mv "${DEPLOY_DIR}" "${DEPLOY_DIR}.old-${ts}"
    echo "    moved live dir → ${DEPLOY_DIR}.old-${ts}"
fi

echo "==> Preparing fresh web root ${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}"
chown -R "${DEPLOY_USER}:www-data" "${DEPLOY_DIR}"
chmod 755 "${DEPLOY_DIR}"

# Look for any nginx vhost referencing the domain and disable it so the new one wins
echo "==> Disabling any pre-existing nginx vhost for ${DOMAIN}"
shopt -s nullglob
for conf in /etc/nginx/sites-enabled/*; do
    name="$(basename "$conf")"
    # Skip the new one we are about to install
    if [ "$name" = "$DOMAIN" ]; then continue; fi
    if grep -qE "server_name[^;]*\b${DOMAIN}\b" "$conf" 2>/dev/null; then
        echo "    disabling $conf"
        mv "$conf" "${conf}.disabled-by-annekedisi-setup"
    fi
done
shopt -u nullglob

echo "==> Installing nginx site"
cat > "/etc/nginx/sites-available/${DOMAIN}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name pinkcrab.ru www.pinkcrab.ru;

    root /var/www/pinkcrab.ru;
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
<html><head><meta charset=utf-8><title>pinkcrab.ru</title></head>
<body><h1>pinkcrab.ru</h1>
<p>Setup OK — waiting for first deploy from GitHub Actions.</p></body></html>
HTML
    chown "${DEPLOY_USER}:www-data" "${DEPLOY_DIR}/index.html"
fi

# Deploy SSH key — if /tmp/deploy_key.pub is provided, install it
if [ -f /tmp/deploy_key.pub ]; then
    echo "==> Installing deploy SSH key for ${DEPLOY_USER}"
    install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
    touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    grep -qxFf /tmp/deploy_key.pub "/home/${DEPLOY_USER}/.ssh/authorized_keys" \
        || cat /tmp/deploy_key.pub >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

echo ""
echo "==> Done. Next steps:"
echo "  1. Verify DNS A record: ${DOMAIN} → 72.56.12.105 (already true)"
echo "  2. Issue TLS cert:  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  3. Push to GitHub or run workflow manually — GitHub Actions will rsync the site."
echo ""
if [ -d "${BACKUP_DIR}" ]; then
    echo "  Old landing archives are in: ${BACKUP_DIR}"
    ls -lah "${BACKUP_DIR}"
fi
