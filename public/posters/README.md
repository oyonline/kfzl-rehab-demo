# public/posters —— 视频库首帧海报（方案 B，2026-09-03）

`VideoLibraryView` 列表卡缩略图用这里的 `<视频id>.jpg`，与 `src/data/seed.ts`
的 `videos[].id` 一一对应。用预抽帧而非 `<video>` 是演示确定性取舍：
打开即显示、无加载闪烁、投屏稳定。

**视频换版后必须重新抽帧**，否则缩略图与实际内容不符。一条命令重建全部：

```bash
for f in public/videos/*.mp4; do
  id=$(basename "$f" .mp4)
  ffmpeg -y -ss 0.1 -i "$f" -frames:v 1 -vf "scale=640:-2" -q:v 4 "public/posters/$id.jpg"
done
```

`-ss 0.1` 取开头第 0.1 秒帧（跳过部分素材首帧全黑）。图片缺失时前端
`onError` 退回深色占位块，不黑屏 —— 与视频缺失的兜底策略一致。
