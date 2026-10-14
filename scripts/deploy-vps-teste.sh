#!/usr/bin/env bash
# Deploy do Educacional na instancia de teste da VPS (https://edu-teste.velociprime.com.br).
# Build local (a VPS nao compila), upload, troca da pasta dist e recriacao so do container
# do Educacional (bind mount so troca de inode ao recriar). Verifica e faz rollback sozinho.
# Nao mexe em WAHA, n8n, Tenis nem Caddy.
set -euo pipefail

VPS="${VPS:-root@149.56.228.208}"
KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
DIR=/opt/veloci-apps
URL="${URL:-https://edu-teste.velociprime.com.br/}"
MANTER_BACKUPS=3

cd "$(dirname "$0")/.."
ssh_vps() { ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=10 "$VPS" "$@"; }

echo "Commit: $(git rev-parse --short HEAD) | alteracoes nao commitadas: $(git status --short | wc -l)"

npx vite build >/dev/null
[ -f dist/index.html ] || { echo "ERRO: o build nao gerou dist/index.html"; exit 1; }
LOCAL_SHA=$(sha256sum dist/index.html | cut -d' ' -f1)

TS=$(date +%Y%m%d%H%M%S)
tar -C dist -czf - . | ssh_vps "set -e; rm -rf $DIR/educacional/dist.new; mkdir $DIR/educacional/dist.new; tar -xzf - -C $DIR/educacional/dist.new"
ssh_vps "set -e; cd $DIR/educacional; mv dist dist.bak-$TS; mv dist.new dist; cd $DIR; docker compose up -d --force-recreate educacional >/dev/null 2>&1"

ok=0
for _ in $(seq 1 20); do
  sleep 2
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$URL" || true)
  [ "$code" = "200" ] && { ok=1; break; }
done
REMOTE_SHA=$(ssh_vps "docker exec veloci-apps-educacional-1 sha256sum /srv/index.html" 2>/dev/null | cut -d' ' -f1 || true)

if [ "$ok" = 1 ] && [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
  ssh_vps "cd $DIR/educacional && ls -dt dist.bak-* | tail -n +$((MANTER_BACKUPS + 1)) | xargs -r rm -rf"
  echo "OK: $URL respondeu 200 e o container serve o build de $(git rev-parse --short HEAD)."
  echo "Rollback manual, se precisar: ssh $VPS 'cd $DIR/educacional && mv dist dist.ruim && mv dist.bak-$TS dist && cd .. && docker compose up -d --force-recreate educacional'"
else
  echo "FALHOU (http=$code, build no container confere=$([ "$REMOTE_SHA" = "$LOCAL_SHA" ] && echo sim || echo nao)). Voltando a versao anterior..."
  ssh_vps "set -e; cd $DIR/educacional; mv dist dist.falhou-$TS; mv dist.bak-$TS dist; cd $DIR; docker compose up -d --force-recreate educacional >/dev/null 2>&1"
  exit 1
fi
