#!/usr/bin/env bash
#
# 交付前自检：在一棵**干净克隆**的树上装依赖、类型检查、跑测试、构建。
#
# 为什么需要这个：2026-08-30 出过一次事故 —— 本地 tsc / build / 浏览器实测
# 全绿，推上去却整个构建失败。根因是 .gitignore 写成 `data/`（少前导斜杠），
# 把 src/data/ 一并吞掉，源码静默漏推。
#
# 本地工作区里那个文件在，所以本地永远照不出来。只有从远端重新克隆才能。
#
# 用法：
#   bash scripts/verify-clean-clone.sh              # 完整（含 313MB 视频，慢）
#   bash scripts/verify-clean-clone.sh --no-videos  # 跳过视频，只验代码（快）
#
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

REMOTE="$(git -C "$PROJECT_DIR" remote get-url origin)"
BRANCH="$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)"
SKIP_VIDEOS=0
[[ "${1:-}" == "--no-videos" ]] && SKIP_VIDEOS=1

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "远端   : $REMOTE"
echo "分支   : $BRANCH"
echo "工作区 : $WORK"
echo

if [[ $SKIP_VIDEOS -eq 1 ]]; then
  echo "==> 克隆（排除 public/videos）"
  git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REMOTE" "$WORK/repo" -q
  git -C "$WORK/repo" sparse-checkout set --no-cone '/*' '!public/videos'
else
  echo "==> 克隆（完整，含视频，约 350 MB）"
  git clone --depth 1 --branch "$BRANCH" "$REMOTE" "$WORK/repo" -q
fi

cd "$WORK/repo"
echo "==> 克隆到的提交：$(git rev-parse --short HEAD)"
echo

echo "==> 源码树完整性（防 .gitignore 误排除）"
for p in src/data src/data/context.tsx server/db/migrations src/store/store.ts; do
  test -e "$p" || { echo "缺失：$p —— 检查 .gitignore"; exit 1; }
done
echo "OK"

if [[ $SKIP_VIDEOS -eq 0 ]]; then
  echo "==> 视频素材（ADR 0013：必须进仓）"
  n=$(ls public/videos/*.mp4 2>/dev/null | wc -l | tr -d ' ')
  [[ "$n" == "17" ]] || { echo "视频数为 $n，应为 17"; exit 1; }
  echo "OK（17 个）"
fi

echo "==> 安装依赖"; pnpm install --frozen-lockfile --silent
echo "==> 类型检查";  pnpm typecheck
echo "==> Lint";       pnpm lint
echo "==> 冒烟测试";   pnpm test
echo "==> 构建";       pnpm build

test -f dist/index.html || { echo "构建产物缺 index.html"; exit 1; }

echo
echo "干净克隆全部通过：$(git rev-parse --short HEAD)"
