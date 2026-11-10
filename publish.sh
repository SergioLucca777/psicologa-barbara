#!/usr/bin/env bash
# Publica a landing em /srv/psi (nginx: https://169.58.180.200/psi/)
# Sobe os arquivos, garante o location no server do SaaS e recarrega o nginx.
set -euo pipefail
SRC=/root/psicologa-barbara
DST=/srv/psi
CONF=/etc/nginx/sites-enabled/saas-gateway

rsync -a --delete "$SRC/index.html" "$SRC/agendar.html" "$DST/"
rsync -a --delete "$SRC/assets/" "$DST/assets/"
chown -R www-data:www-data "$DST"
chmod -R a+rX "$DST"

if ! grep -q 'location /psi/' "$CONF"; then
python3 - "$CONF" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
block = """    # Landing da psicologa (estatico) — preview publico em /psi/
    location = /psi { return 301 /psi/; }
    location /psi/ {
        root /srv;
        index index.html;
        try_files $uri $uri/ /psi/index.html;
        expires -1;
    }

"""
marker = "    location / {\n        proxy_pass http://127.0.0.1:3010;"
assert marker in s, 'marcador nao encontrado em ' + p
open(p, 'w').write(s.replace(marker, block + marker, 1))
print('location /psi/ adicionado')
PY
fi

nginx -t
systemctl reload nginx
echo "publicado: https://169.58.180.200/psi/"
echo "temas:     ?tema=azul  |  ?tema=marinho"
