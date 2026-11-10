#!/usr/bin/env bash
# Publica a landing em /srv/psi (nginx: https://169.58.180.200/psi/)
set -euo pipefail
SRC=/root/psicologa-barbara
DST=/srv/psi
rsync -a --delete "$SRC/index.html" "$SRC/agendar.html" "$DST/"
rsync -a --delete "$SRC/assets/" "$DST/assets/"
chown -R www-data:www-data "$DST"
chmod -R a+rX "$DST"
echo "publicado: https://169.58.180.200/psi/"
