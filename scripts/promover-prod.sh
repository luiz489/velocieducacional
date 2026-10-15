#!/usr/bin/env bash
# Promove para PRODUCAO (educacional.velociprime.com.br) o build que ja esta no staging (edu-teste), sem
# recompilar: o que roda em producao e exatamente o que foi testado. Guarda a versao anterior, recria so
# o container de producao, confere por dentro dele e volta sozinho para a anterior se nao subir.
# Fluxo: bash scripts/deploy-vps-teste.sh  ->  testar em edu-teste  ->  bash scripts/promover-prod.sh --confirmo
set -euo pipefail

[ "${1:-}" = "--confirmo" ] || { echo "Isso muda a PRODUCAO (clientes reais). Rode com --confirmo se for isso mesmo."; exit 2; }

VPS="${VPS:-root@149.56.228.208}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
DIR=/opt/veloci-apps
MANTER_BACKUPS=3
ssh_vps() { ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=10 "$VPS" "$@"; }
no_container() { ssh_vps "docker exec veloci-apps-$1-1 wget -q -T 5 -O /dev/null http://127.0.0.1/"; }

no_container educacional || { echo "ERRO: o staging nao responde; nada foi promovido."; exit 1; }
SHA_STAGING=$(ssh_vps "sha256sum $DIR/educacional/dist/index.html" | cut -d' ' -f1)

TS=$(date +%Y%m%d%H%M%S)
ssh_vps "set -e; cd $DIR; rm -rf educacional-prod/dist.new; cp -a educacional/dist educacional-prod/dist.new; mv educacional-prod/dist educacional-prod/dist.bak-$TS; mv educacional-prod/dist.new educacional-prod/dist; docker compose up -d --force-recreate educacional-prod >/dev/null 2>&1"

ok=0
for _ in $(seq 1 20); do
  sleep 2
  no_container educacional-prod 2>/dev/null && { ok=1; break; }
done
SHA_PROD=$(ssh_vps "docker exec veloci-apps-educacional-prod-1 sha256sum /srv/index.html" 2>/dev/null | cut -d' ' -f1 || true)

if [ "$ok" = 1 ] && [ "$SHA_PROD" = "$SHA_STAGING" ]; then
  ssh_vps "cd $DIR/educacional-prod && ls -dt dist.bak-* | tail -n +$((MANTER_BACKUPS + 1)) | xargs -r rm -rf"
  echo "OK: producao roda o mesmo build do staging (${SHA_PROD:0:12})."
  echo "Rollback manual, se precisar: ssh $VPS 'cd $DIR/educacional-prod && mv dist dist.ruim && mv dist.bak-$TS dist && cd .. && docker compose up -d --force-recreate educacional-prod'"
else
  echo "FALHOU (container responde=$([ "$ok" = 1 ] && echo sim || echo nao), build confere=$([ "$SHA_PROD" = "$SHA_STAGING" ] && echo sim || echo nao)). Voltando a versao anterior..."
  ssh_vps "set -e; cd $DIR/educacional-prod; mv dist dist.falhou-$TS; mv dist.bak-$TS dist; cd $DIR; docker compose up -d --force-recreate educacional-prod >/dev/null 2>&1"
  exit 1
fi
