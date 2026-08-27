import type { VideoAsset } from '../data/types'
import { IconPlay } from './Icons'

/**
 * 播放区。
 *
 * 正式示范视频到位后（素材死线 9/1）填入 videos[].src，播放器自动接管；
 * 在此之前不做假播放，改为引导看下方分步图文 —— 图文本身也是训练页应有的内容。
 */
export function VideoStage({ video, onWantSteps }: { video: VideoAsset; onWantSteps?: () => void }) {
  if (video.src) {
    return (
      <div className="stage">
        <video className="stage-v" src={video.src} poster={video.poster} controls preload="metadata" />
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
