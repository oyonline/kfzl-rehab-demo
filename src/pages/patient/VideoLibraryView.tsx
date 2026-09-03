import { Link } from 'react-router-dom'
import { usePatientData, useContent } from '../../data/context'
import { IconPlay } from '../../components/Icons'

/**
 * 训练视频库。
 *
 * 17 个视频全部是甲方拍摄的真实素材，因此不做「制作中」占位卡 ——
 * 列表里出现的每一个都点得开、播得了。
 *
 * 缩略图：每个视频的首帧已预抽成 `public/posters/<id>.jpg`（2026-09-03
 * 用户裁决方案 B）。用 <img> 而非 <video preload="metadata"> 是为了演示
 * 确定性 —— 打开列表即显示，无逐卡加载的灰黑闪烁，投屏零翻车。
 * 注意：**视频换版后须重新抽帧**（命令见 public/posters/README）。
 * 图片缺失或加载失败时退回原深色占位块，不黑屏。
 *
 * 按甲方交付的文件夹分六类展示；某一类没有视频时整块不渲染，
 * 不留空标题。
 */
export function VideoLibraryView() {
  const { taskDefs } = usePatientData()
  const { videoCategories: VIDEO_CATEGORIES, videos, videoSteps: VIDEO_STEPS } = useContent()
  return (
    <div className="stack">
      {VIDEO_CATEGORIES.map((cat) => {
        const group = videos.filter((v) => v.category === cat)
        if (!group.length) return null
        return (
          <section className="stack" key={cat}>
            <div className="video-category-title">{cat}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {group.map((v) => {
                const task = taskDefs.find((t) => t.videoId === v.id)
                const steps = VIDEO_STEPS[v.id]?.length ?? 0
                return (
                  <Link className="vcard" to={`/patient/videos/${v.id}`} key={v.id}>
                    <div className="vcard-thumb">
                      <img
                        className="vcard-poster"
                        src={`/posters/${v.id}.jpg`}
                        alt=""
                        loading="lazy"
                        onError={(e) => { e.currentTarget.remove() }}
                      />
                      <span className="stage-play" style={{ width: 44, height: 44 }}><IconPlay size={16} /></span>
                    </div>
                    <div className="vcard-body">
                      <div className="vcard-t">{v.title}</div>
                      {/* 甲方未给每个视频的一句话说明，没有就整行不渲染，不填废话 */}
                      {v.goal && <div className="vcard-d">{v.goal}</div>}
                      <div className="vcard-m">
                        {task && <span className="chip chip-brand">{task.scheduledTime} 安排</span>}
                        {steps > 0 && <span className="chip">{steps} 个步骤</span>}
                        {v.durationSec && (
                          <span className="chip num">
                            {v.durationSec < 60 ? `约 ${v.durationSec} 秒` : `约 ${Math.round(v.durationSec / 60)} 分钟`}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
