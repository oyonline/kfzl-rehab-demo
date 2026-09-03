import { Link, useParams } from 'react-router-dom'
import { InlineRich } from '../../components/RichText'
import { usePatientData, useContent } from '../../data/context'
import { guidanceIcon } from './GuidanceView'
import { IconAlert, IconChevron, IconPlay } from '../../components/Icons'

export function GuidanceDetailView() {
  const { guidance: GUIDANCE } = useContent()
  const { therapist } = usePatientData()
  const { videos } = useContent()
  const { id } = useParams()
  const g = GUIDANCE.find((x) => x.id === id)
  if (!g) return <section className="card card-pad">没有找到这条指导</section>

  const video = g.relatedVideoId ? videos.find((v) => v.id === g.relatedVideoId) : undefined
  const others = GUIDANCE.filter((x) => x.id !== g.id)

  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient/guidance">饮食指导</Link>
        <span>/</span>
        <span>{g.title}</span>
      </div>

      <section className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <span className="grow-ico" style={{ width: 52, height: 52 }}>{guidanceIcon(g.id)}</span>
          <span>
            <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{g.title}</h1>
            <p className="card-note" style={{ marginTop: 3 }}>{g.summary}</p>
          </span>
        </div>

        <ol className="steps">
          {g.items.map((it, i) => (
            <li key={it}>
              <span className="steps-n num">{i + 1}</span>
              <span className="steps-d" style={{ color: 'var(--ink)', paddingTop: 2 }}><InlineRich text={it} /></span>
            </li>
          ))}
        </ol>

        {g.alert && (
          <div className="alert" style={{ marginTop: 22 }}>
            <span style={{ flex: 'none', marginTop: 2 }}><IconAlert size={15} /></span>
            <span>{g.alert}</span>
          </div>
        )}

        <p className="card-note" style={{ marginTop: 18 }}>
          有拿不准的地方，随时问 {therapist.name} 康复师。
        </p>
      </section>

      {video && (
        <Link className="vcard" to={`/patient/videos/${video.id}`} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 18 }}>
          <span className="stage-play" style={{ width: 46, height: 46, margin: 0, background: 'var(--green-700)', border: 'none' }}>
            <IconPlay size={15} />
          </span>
          <span style={{ flex: 1 }}>
            <div className="grow-t">相关训练：{video.title}</div>
            <div className="grow-s">{video.goal}</div>
          </span>
          <span className="grow-go"><IconChevron /></span>
        </Link>
      )}

      <section className="card card-pad">
        <div className="card-hd"><h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>其他指导</h2></div>
        <div className="glist">
          {others.map((o) => (
            <Link className="grow" to={`/patient/guidance/${o.id}`} key={o.id}>
              <span className="grow-ico">{guidanceIcon(o.id)}</span>
              <span style={{ flex: 1 }}>
                <span className="grow-t">{o.title}</span>
                <span className="grow-s">{o.summary}</span>
              </span>
              <span className="grow-go"><IconChevron /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
