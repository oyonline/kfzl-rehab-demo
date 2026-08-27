import { Link } from 'react-router-dom'
import { taskDefs, videos } from '../../data/seed'
import { VIDEO_STEPS } from '../../data/videoSteps'
import { IconPlay } from '../../components/Icons'

export function VideoLibraryView() {
  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient">今日安排</Link>
        <span>/</span>
        <span>训练视频</span>
      </div>

      <section className="card card-pad">
        <div className="eyebrow">训练视频</div>
        <h2 className="card-title">康复师为她安排的训练</h2>
        <p className="card-note" style={{ marginTop: 6 }}>
          每一项都对应今日安排里的一个时间点，照着做即可
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {videos.map((v) => {
          const task = taskDefs.find((t) => t.videoId === v.id)
          const steps = VIDEO_STEPS[v.id]?.length ?? 0
          return (
            <Link className="vcard" to={`/patient/videos/${v.id}`} key={v.id}>
              <div className="vcard-thumb">
                <span className="stage-play" style={{ width: 44, height: 44 }}><IconPlay size={16} /></span>
              </div>
              <div className="vcard-body">
                <div className="vcard-t">{v.title}</div>
                <div className="vcard-d">{v.goal}</div>
                <div className="vcard-m">
                  {task && <span className="chip">{task.scheduledTime} 安排</span>}
                  <span className="chip">{steps} 个步骤</span>
                  {v.durationSec && <span className="chip num">约 {Math.round(v.durationSec / 60)} 分钟</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
