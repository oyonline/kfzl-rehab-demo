import { Link } from 'react-router-dom'
import { GUIDANCE } from '../../data/guidance'
import { patient } from '../../data/seed'
import { IconAlert, IconApple, IconChevron, IconHeart, IconHome, IconUtensils } from '../../components/Icons'

export const GUIDANCE_ICON: Record<string, React.ReactNode> = {
  feeding: <IconUtensils size={19} />,
  diet: <IconApple size={19} />,
  monitor: <IconHeart size={19} />,
  safety: <IconHome size={19} />,
}

export function GuidanceView() {
  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="eyebrow">饮食与健康指导</div>
        <h2 className="card-title">按 {patient.diagnosis.stage} 给出的日常建议</h2>
        <p className="card-note" style={{ marginTop: 6 }}>
          结合她的吞咽情况、合并疾病与跌倒风险整理；涉及性状调整与用药的部分由康复师确定
        </p>
      </section>

      <div className="glist">
        {GUIDANCE.map((g) => (
          <Link className="grow" to={`/patient/guidance/${g.id}`} key={g.id}>
            <span className="grow-ico">{GUIDANCE_ICON[g.id]}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="grow-t">{g.title}</span>
              <span className="grow-s">{g.summary}</span>
              <span className="grow-m">
                <span className="chip num">{g.items.length} 条建议</span>
                {g.alert && <span className="chip chip-miss"><IconAlert size={11} /> 含就医提示</span>}
              </span>
            </span>
            <span className="grow-go"><IconChevron /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}
