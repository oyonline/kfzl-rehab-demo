import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {toISODate} from '../../data/seed'
import { usePatientData, useContent } from '../../data/context'
import { addUpload, effectiveStatus, setCheckIn, useDemoState } from '../../store/store'
import { VideoStage } from '../../components/VideoStage'
import { UploadPanel } from '../../components/UploadPanel'
import { IconAlert, IconCheck } from '../../components/Icons'

export function VideoDetailView() {
  const { patient, taskDefs, therapist } = usePatientData()
  const { videos, videoSteps: VIDEO_STEPS } = useContent()
  const { id } = useParams()
  const state = useDemoState()
  const stepsRef = useRef<HTMLDivElement>(null)
  const [showUpload, setShowUpload] = useState(false)

  const video = videos.find((v) => v.id === id)
  if (!video) return <section className="card card-pad">没有找到这个训练</section>

  const task = taskDefs.find((t) => t.videoId === video.id)
  const today = toISODate(new Date())
  const checkIn = task ? state.checkIns.find((c) => c.taskId === task.id && c.date === today) : undefined
  const status = task ? effectiveStatus(task, checkIn) : 'pending'
  const steps = VIDEO_STEPS[video.id] ?? []
  const upload = state.uploads.find((u) => u.taskId === task?.id && u.date === today)

  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient">今日安排</Link>
        <span>/</span>
        <span>{video.title}</span>
      </div>

      <VideoStage video={video} onWantSteps={steps.length ? () => stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : undefined} />

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">{video.category}</div>
            <h2 className="card-title">{video.title}</h2>
          </div>
          {task && <span className="chip chip-brand">{task.scheduledTime} · {task.reps}</span>}
        </div>

        <dl className="kv">
          {video.goal && <><dt>训练目标</dt><dd>{video.goal}</dd></>}
          {video.target && <><dt>适用对象</dt><dd>{video.target}</dd></>}
          {task && <><dt>本次要求</dt><dd>{task.instruction}</dd></>}
        </dl>

        {/* 注意事项只在甲方计划表里有据可查时才显示，不替其编造 */}
        <div className="alert" style={{ background: 'var(--wait-bg)', color: 'var(--wait)' }}>
          <span style={{ flex: 'none', marginTop: 2 }}><IconAlert size={15} /></span>
          <span>
            {video.cautions?.length ? `${video.cautions.join('；')}。` : ''}
            有任何不适立即停止，并告诉 {therapist.name} 康复师。
          </span>
        </div>
      </section>

      {steps.length > 0 && (
        <section className="card card-pad" ref={stepsRef}>
          <div className="card-hd">
            <div>
              <div className="eyebrow">分步说明</div>
              <h2 className="card-title">{patient.caregiver.name}照着做就可以</h2>
            </div>
            <span className="card-note num">共 {steps.length} 步</span>
          </div>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="steps-n num">{i + 1}</span>
                <span>
                  <div className="steps-t">{s.title}</div>
                  <div className="steps-d">{s.detail}</div>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {task && (
        <section className="card card-pad">
          <div className="card-hd">
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>做完了？</h2>
            {status === 'done' && <span className="chip chip-ok"><IconCheck size={10} /> 今天已完成</span>}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {status !== 'done' && (
              <button className="btn btn-lg" onClick={() => setCheckIn(task.id, 'done')}>
                <IconCheck size={13} /> 完成打卡
              </button>
            )}
            {task.requiresVideoUpload && !upload && (
              <button className="btn-quiet" onClick={() => setShowUpload(true)}>回传训练视频给康复师</button>
            )}
          </div>

          {task.requiresVideoUpload && (
            <p className="card-note" style={{ marginTop: 12 }}>
              {upload
                ? `已回传 ${upload.filename}，${therapist.name} 康复师可以在工作台看到`
                : '回传后康复师能看到她实际做的情况，便于下次调整训练'}
            </p>
          )}

          {showUpload && task && (
            <UploadPanel
              onCancel={() => setShowUpload(false)}
              onDone={(filename, sizeLabel) => {
                addUpload(task.id, filename, sizeLabel, video.id)
                setShowUpload(false)
              }}
            />
          )}
        </section>
      )}
    </div>
  )
}
