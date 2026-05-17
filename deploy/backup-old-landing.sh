#!/usr/bin/env bash
# Standalone backup of the existing pinkcrab.ru landing (run on the server as root).
# Use this if you want to archive the old site WITHOUT running the full server-setup.
#
#   ssh root@72.56.12.105 'bash -s' < deploy/backup-old-landing.sh
#
# Output:
#   /var/backups/pinkcrab.ru-old/landing-YYYYMMDDTHHMMSSZ.tar.gz
#   /var/backups/pinkcrab.ru-old/nginx-config-YYYYMMDDTHHMMSSZ.tar.gz

set -euo pipefail

BACKUP_DIR="/var/backups/pinkcrab.ru-old"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

# Find every docroot serving pinkcrab.ru in nginx and back them up.
roots=$(grep -rEl 'server_name[^;]*\bpinkcrab\.ru\b' /etc/nginx/ 2>/dev/null \
        | xargs -r awk '/^[[:space:]]*root[[:space:]]/ { gsub(";",""); print $2 }' \
        | sort -u)

if [ -z "${roots}" ]; then
    echo "No nginx vhost found for pinkcrab.ru — falling back to /var/www/pinkcrab.ru"
    roots="/var/www/pinkcrab.ru"
fi

for root in ${roots}; do
    if [ -d "${root}" ]; then
        safe="$(echo "${root}" | tr '/' '_')"
        archive="${BACKUP_DIR}/landing${safe}-${ts}.tar.gz"
        echo "Archiving ${root} → ${archive}"
        tar -C "${root}" -czf "${archive}" .
        ls -lah "${archive}"
    else
        echo "Skip (missing): ${root}"
    fi
done

# Also save the nginx vhost configs that mention the domain.
conf_archive="${BACKUP_DIR}/nginx-config-${ts}.tar.gz"
mapfile -t confs < <(grep -rEl 'server_name[^;]*\bpinkcrab\.ru\b' /etc/nginx/ 2>/dev/null || true)
if [ "${#confs[@]}" -gt 0 ]; then
    tar -czf "${conf_archive}" "${confs[@]}"
    echo "Archived ${#confs[@]} nginx config file(s) → ${conf_archive}"
fi

echo ""
echo "Backups saved in: ${BACKUP_DIR}"
ls -lah "${BACKUP_DIR}"

echo ""
echo "To copy them to your workstation:"
echo "  scp 'root@72.56.12.105:${BACKUP_DIR}/*.tar.gz' ./"
