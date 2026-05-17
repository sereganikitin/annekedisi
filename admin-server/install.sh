#!/usr/bin/env bash
# Install the admin API on 72.56.12.105.
#
# Run via:
#   scp admin-server/server.js admin-server/admin.service admin-server/install.sh \
#       seldegram@72.56.12.105:/tmp/
#   ssh -t seldegram@72.56.12.105 'sudo bash /tmp/install.sh'
#
# You will be prompted for an admin username + password. Both are hashed with
# scrypt and stored only on the server. Repeat the install to rotate.

# Self-heal CRLF if scp'd from a Windows working tree.
# This block is the very first executable code: bash on Linux cannot parse
# 'fi\r' or 'then\r', so we use only single-line commands with no
# control structures. The flag is set in env so re-exec doesn't loop.
[ -n "${INSTALL_CRLF_CLEANED:-}" ] || ( sed -i 's/\r$//' "$0" )
[ -n "${INSTALL_CRLF_CLEANED:-}" ] || exec env INSTALL_CRLF_CLEANED=1 bash "$0" "$@"

set -euo pipefail

INSTALL_DIR="/opt/admin"
DATA_DIR="/var/www/admin-data"
SERVICE_NAME="admin"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_VHOST="/etc/nginx/sites-available/pinkcrab.ru"

# --- 1. Node 22 ---
if ! command -v node >/dev/null 2>&1; then
    echo "==> Installing Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
node --version

# --- 2. Stop and remove the old oauth-proxy if it exists ---
if systemctl list-unit-files --no-legend | grep -q "^oauth-proxy.service"; then
    echo "==> Tearing down legacy oauth-proxy"
    systemctl disable --now oauth-proxy.service || true
    rm -f /etc/systemd/system/oauth-proxy.service
    rm -rf /opt/decap-oauth
    systemctl daemon-reload
fi

# --- 3. Drop files (strip any CRLF on the way in) ---
echo "==> Installing files into ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
tr -d '\r' < /tmp/server.js     > "${INSTALL_DIR}/server.js"
tr -d '\r' < /tmp/admin.service > "${SERVICE_FILE}"
chown root:root "${INSTALL_DIR}/server.js" "${SERVICE_FILE}"
chmod 644      "${INSTALL_DIR}/server.js" "${SERVICE_FILE}"

# --- 4. Live data dir, writable by www-data ---
mkdir -p "${DATA_DIR}"
chown -R www-data:www-data "${DATA_DIR}"
chmod 755 "${DATA_DIR}"

# Seed live partner-links.json from the repo on first install only.
if [ ! -s "${DATA_DIR}/partner-links.json" ]; then
    echo "==> Seeding partner-links.json from GitHub"
    if curl -fsSL https://raw.githubusercontent.com/sereganikitin/annekedisi/main/data/partner-links.json \
        -o "${DATA_DIR}/partner-links.json.new"; then
        mv "${DATA_DIR}/partner-links.json.new" "${DATA_DIR}/partner-links.json"
        chown www-data:www-data "${DATA_DIR}/partner-links.json"
    else
        echo "    seed failed — admin will show defaults until first save"
        rm -f "${DATA_DIR}/partner-links.json.new"
    fi
fi

# --- 5. Credentials ---
if [ ! -s "${INSTALL_DIR}/env" ] || [ "${1:-}" = "--rotate" ]; then
    echo
    echo "Set up admin credentials (will be stored as scrypt hash, never as plaintext)"
    read -r -p "Username: " USERNAME
    while [ -z "${USERNAME}" ]; do read -r -p "Username: " USERNAME; done
    while :; do
        read -r -s -p "Password: " P1; echo
        read -r -s -p "Confirm:  " P2; echo
        if [ "${P1}" = "${P2}" ] && [ -n "${P1}" ]; then break; fi
        echo "  ✗ mismatch / empty, try again"
    done

    SALT_HEX="$(node -e 'process.stdout.write(require("crypto").randomBytes(16).toString("hex"))')"
    HASH_HEX="$(node -e "
      const c=require('crypto');
      process.stdout.write(c.scryptSync(process.argv[1], Buffer.from(process.argv[2],'hex'), 64).toString('hex'));
    " "${P1}" "${SALT_HEX}")"
    JWT_SECRET="$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"

    echo
    echo "Cloudflare Turnstile (anti-spam for comments) — optional, press Enter to skip."
    echo "  Get keys: https://dash.cloudflare.com/?to=/:account/turnstile (free)"
    echo "  Allowed hostnames must include: pinkcrab.ru"
    read -r -p "Turnstile Site Key (public, can be empty): " TS_SITE
    TS_SECRET=""
    if [ -n "${TS_SITE}" ]; then
        read -r -s -p "Turnstile Secret Key: " TS_SECRET; echo
    fi

    echo
    echo "Comment moderation:"
    echo "  [1] Manual moderation (recommended) — comments wait for your approval"
    echo "  [2] Auto-publish — comments appear immediately"
    read -r -p "Choice [1]: " MODCHOICE
    AUTO_APPROVE="0"
    if [ "${MODCHOICE}" = "2" ]; then AUTO_APPROVE="1"; fi

    umask 077
    cat > "${INSTALL_DIR}/env" <<EOF
ADMIN_USER=${USERNAME}
ADMIN_PASSWORD_SALT=${SALT_HEX}
ADMIN_PASSWORD_HASH=${HASH_HEX}
JWT_SECRET=${JWT_SECRET}
DATA_DIR=${DATA_DIR}
PORT=7777
TURNSTILE_SITE_KEY=${TS_SITE}
TURNSTILE_SECRET=${TS_SECRET}
COMMENTS_AUTO_APPROVE=${AUTO_APPROVE}
EOF
    chown root:www-data "${INSTALL_DIR}/env"
    chmod 640 "${INSTALL_DIR}/env"
    umask 022
    unset P1 P2 TS_SECRET
else
    echo "==> ${INSTALL_DIR}/env already present — keeping existing creds"
    echo "    To rotate credentials:    sudo bash $0 --rotate"
    echo "    To add Turnstile later:   sudo nano ${INSTALL_DIR}/env  (then sudo systemctl restart ${SERVICE_NAME})"
fi

# --- 6. Systemd ---
echo "==> Enabling systemd"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service" >/dev/null 2>&1 || true
# Restart picks up any server.js change. If the unit wasn't running yet,
# this starts it.
systemctl restart "${SERVICE_NAME}.service"
sleep 1
systemctl status "${SERVICE_NAME}.service" --no-pager | head -10

# --- 7. nginx — /api/ proxy + /data/partner-links.json alias ---
echo "==> Patching nginx vhost"
python3 - "$NGINX_VHOST" <<'PYEOF'
import sys, re
path = sys.argv[1]
src = open(path).read()
changed = False

api_block = """
    location /api/ {
        proxy_pass http://127.0.0.1:7777/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 1m;
    }

"""

data_block = """    location = /data/partner-links.json {
        alias /var/www/admin-data/partner-links.json;
        add_header Cache-Control "no-cache";
        default_type application/json;
    }

"""

# Remove any legacy /oauth/ block (was for Sveltia OAuth proxy)
new = re.sub(r'\n    location /oauth/ \{[^}]*\}\n', '\n', src)
if new != src:
    changed = True
    src = new

if 'location /api/' not in src:
    src = re.sub(r'(\n    location / \{)', api_block + r'\1', src, count=1)
    changed = True

if '/data/partner-links.json' not in src:
    src = re.sub(r'(\n    location / \{)', data_block + r'\1', src, count=1)
    changed = True

if changed:
    open(path, 'w').write(src)
    print("    vhost updated")
else:
    print("    vhost unchanged (already patched)")
PYEOF

nginx -t
systemctl reload nginx

# --- 8. Smoke test ---
echo "==> Smoke test"
curl -sS -o /dev/null -w "internal:                              %{http_code}\n" http://127.0.0.1:7777/healthz
curl -sS -o /dev/null -w "GET https://pinkcrab.ru/api/healthz:   %{http_code}\n" https://pinkcrab.ru/api/healthz
curl -sS -o /dev/null -w "GET https://pinkcrab.ru/api/partners:  %{http_code} (expect 401)\n" https://pinkcrab.ru/api/partners
curl -sS -o /dev/null -w "GET /data/partner-links.json:          %{http_code}\n" https://pinkcrab.ru/data/partner-links.json

echo
echo "Done. Admin endpoints live at https://pinkcrab.ru/api/*"
echo "Admin UI lives at https://pinkcrab.ru/admin/ once the static site is redeployed."
