#!/usr/bin/env bash
# Tira a landing do ar sem apagar o projeto (/root/psicologa-barbara continua intacto).
set -euo pipefail
CONF=/etc/nginx/sites-enabled/saas-gateway

python3 - "$CONF" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
start = s.find('    # Landing da psicologa (estatico)')
if start == -1:
    print('bloco /psi/ nao estava presente')
else:
    end = s.find('    location / {\n        proxy_pass', start)
    open(p, 'w').write(s[:start] + s[end:])
    print('bloco /psi/ removido')
PY

# site avulso na 8445 e regra de firewall
rm -f /etc/nginx/sites-enabled/psicologa
iptables -C INPUT -p tcp --dport 8445 -j ACCEPT 2>/dev/null && iptables -D INPUT -p tcp --dport 8445 -j ACCEPT || true

nginx -t
systemctl reload nginx
rm -rf /srv/psi
echo "fora do ar. projeto preservado em /root/psicologa-barbara"
echo "para voltar: /root/psicologa-barbara/publish.sh"
