#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

EXPOSE_PORT=$(awk -F '[ =]+' '/^expose_port/ {gsub(/[^0-9]/, "", $2); print $2; exit}' .preview 2>/dev/null || echo 5000)

API_PORT="${API_PORT:-5100}"
export API_PORT

fuser -k "${EXPOSE_PORT}/tcp" 2>/dev/null || true
fuser -k "${API_PORT}/tcp" 2>/dev/null || true
sleep 1

# 预览单命令起双进程：Express 供 /api（vite 代理到 API_PORT），Vite 占 expose_port
PORT="$API_PORT" pnpm run server > /tmp/preview-server.log 2>&1 &

exec pnpm exec vite --host 0.0.0.0 --port "$EXPOSE_PORT"
