#!/usr/bin/env bash
# Publica a versão com movimento em /psi-motion/ (não toca em /psi/)
set -euo pipefail
cd "$(dirname "$0")"
rsync -a --delete --exclude 'shots' --exclude 'preview' --exclude '.git' ./ /srv/psi-motion/
echo "publicado: https://169.58.180.200/psi-motion/"
