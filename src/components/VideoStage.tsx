import { useEffect, useState } from 'react'
import type { VideoAsset } from '../data/types'
import { IconPlay } from './Icons'

/**
 * 播放区。
 *
 * 视频文件不在仓库里（约 390MB，随压缩包另发，解压到 public/videos/）。
 * 因此必须假设它可能不在：参赛人漏拷、解压到错目录、文件损坏 —— 现场就是黑屏。
 * 加载失败时退回分步图文，页面照常成立，不出现黑框或报错。
 * 图文本身也是训练页应有的内容，不是占位。
 */
export function VideoStage({ video, onWantSteps }: { video: VideoAsset; onWantSteps?: () => void }) {
  const [failed, setFailed] = useState(false)

  // 切换到另一个视频时重置，否则上一个的失败状态会带过来
  useEffect(() => { setFailed(false) }, [video.id])

  if (video.src && !failed) {
    return (
      <div className="stage">
        <video
          className="stage-v"
          src={video.src}
          poster={video.poster}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }
  return (
    <div className="stage stage-empty">
      <div className="stage-glow" />
      <div className="stage-inner">
        <span className="stage-play"><IconPlay size={20} /></span>
        <div className="stage-t">{video.title}</div>
        <div className="stage-d">{video.category}{video.durationSec ? ` · 约 ${Math.round(video.durationSec / 60)} 分钟` : ''}</div>
        {onWantSteps && (
          <button className="btn-quiet stage-btn" onClick={onWantSteps}>按分步说明做</button>
        )}
      </div>
    </div>
  )
}
