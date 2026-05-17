#!/usr/bin/env bash
# Install the GitHub OAuth proxy on 72.56.12.105.
# Run via:
#   scp oauth-proxy/server.js oauth-proxy/oauth-proxy.service oauth-proxy/install.sh \
#       seldegram@72.56.12.105:/tmp/
#   ssh -t seldegram@72.56.12.105 'sudo bash /tmp/install.sh'
#
# You will be prompted for the OAuth App Client Secret (one-time, stored only
# on the server, never committed). The Client ID is fixed via env below — edit
# this script if you change the OAuth App.

set -euo pipefail

CLIENT_ID="Ov23liaWF3BPxFRcqp40"
ORIGIN="https://pinkcrab.ru"
INSTALL_DIR="/opt/decap-oauth"
SERVICE_NAME="oauth-proxy"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_VHOST="/etc/nginx/sites-available/pinkcrab.ru"

# --- 1. Node.js present? ---
if ! command -v node >/dev/null 2>&1; then
    echo "==> Installing Node.js 22 (nodesource)…"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
node --version

# --- 2. Drop files ---
echo "==> Installing files into ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
install -o root -g root -m 644 /tmp/server.js "${INSTALL_DIR}/server.js"
install -o root -g root -m 644 /tmp/oauth-proxy.service "${SERVICE_FILE}"

# --- 3. Client secret ---
if [ ! -s "${INSTALL_DIR}/env" ]; then
    echo
    echo "Enter the GitHub OAuth App Client Secret for client_id=${CLIENT_ID}"
    echo "  Generate at: https://github.com/settings/developers → your OAuth App → 'Generate a new client secret'"
    read -r -s -p "Client Secret: " SECRET
    echo
    if [ -z "${SECRET}" ]; then
        echo "Aborted — empty secret"
        exit 1
    fi
    umask 077
    cat > "${INSTALL_DIR}/env" <<EOF
OAUTH_CLIENT_ID=${CLIENT_ID}
OAUTH_CLIENT_SECRET=${SECRET}
OAUTH_ORIGIN=${ORIGIN}
OAUTH_PORT=7777
OAUTH_SCOPES=repo,user
EOF
    chown root:www-data "${INSTALL_DIR}/env"
    chmod 640 "${INSTALL_DIR}/env"
    umask 022
else
    echo "==> ${INSTALL_DIR}/env already present — keeping existing secret"
fi

# --- 4. Systemd ---
echo "==> Enabling systemd service"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.service"
sleep 1
systemctl status "${SERVICE_NAME}.service" --no-pager | head -10

# --- 5. Nginx — add /oauth/ proxy block if missing ---
echo "==> Patching nginx vhost"
if grep -q "location /oauth/" "${NGINX_VHOST}"; then
    echo "    already patched"
else
    # Insert proxy block just before the first 'location /' line in the SSL server.
    python3 - "$NGINX_VHOST" <<'PYEOF'
import sys, re
path = sys.argv[1]
src = open(path).read()
block = """
    location /oauth/ {
        proxy_pass http://127.0.0.1:7777/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }

"""
new = re.sub(r'(\n    location / \{)', block + r'\1', src, count=1)
if new == src:
    sys.exit("Could not find 'location /' in vhost — patch by hand")
open(path, "w").write(new)
PYEOF
    nginx -t
    systemctl reload nginx
    echo "    /oauth/ block added"
fi

# --- 6. Smoke test ---
echo "==> Smoke test"
curl -sS -o /dev/null -w "internal:  %{http_code}\n" http://127.0.0.1:7777/healthz
curl -sS -o /dev/null -w "via nginx: %{http_code}\n" https://pinkcrab.ru/oauth/healthz

echo
echo "Done. Now in the GitHub OAuth App settings (client_id=${CLIENT_ID}):"
echo "  Authorization callback URL → ${ORIGIN}/oauth/callback"
