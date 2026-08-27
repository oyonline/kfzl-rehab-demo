import { GUIDANCE } from '../../data/guidance'
import { patient } from '../../data/seed'
import { IconAlert } from '../../components/Icons'

export function GuidanceView() {
  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="eyebrow">饮食与健康指导</div>
        <h2 className="card-title">按 {patient.diagnosis.stage} 给出的日常建议</h2>
        <p className="card-note" style={{ marginTop: 6 }}>
          结合她的吞咽情况、合并疾病与跌倒风险整理；涉及性状调整与用药的部分由康复师确定。
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        {GUIDANCE.map((g) => (
          <article className="gcard" key={g.id}>
            <div className="gcard-t">{g.title}</div>
            <div className="gcard-s">{g.summary}</div>
            <ul className="olist">
              {g.items.map((it) => <li key={it}><span>{it}</span></li>)}
            </ul>
            {g.alert && (
              <div className="alert">
                <span style={{ flex: 'none', marginTop: 2 }}><IconAlert size={15} /></span>
                <span>{g.alert}</span>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
