#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"
export PORT

# 清理残留端口（绝不碰 9000）
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1

exec pnpm exec tsx server/index.ts
