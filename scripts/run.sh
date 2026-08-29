#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"
export PORT

# 清理残留端口（只碰 $PORT，绝不碰 9000）
#
# fuser 只有 Linux 有，macOS 没有 —— 原先直接调，参赛人在 Mac 上启动时
# 会先看到一大段 fuser 用法说明，像报错一样，而部署文档写的是
# 「看到 Server running 这一行就是起来了」。两处都静音，谁在也不出噪声。
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
elif command -v lsof >/dev/null 2>&1; then
  lsof -ti "tcp:${PORT}" 2>/dev/null | xargs -r kill 2>/dev/null || true
fi
sleep 1

exec pnpm exec tsx server/index.ts
