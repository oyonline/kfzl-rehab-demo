import { Link, useParams } from 'react-router-dom'
import { InlineRich } from '../../components/RichText'
import { BROCHURE } from '../../data/resources'
import { EXPERTS, EXPERT_BOOKING_CHANNELS, EXPERT_NOTICE, POLICIES } from '../../data/resources'
import { IconAlert, IconChevron } from '../../components/Icons'

/**
 * 宣传册 / 政策 / 专家 的通用详情页 —— /patient/resources/:kind/:id。
 * kind: brochure | policy | expert
 */
export function ResourceDetailView() {
  const { kind, id } = useParams()

  if (kind === 'brochure') {
    const s = BROCHURE.find((x) => x.id === id)
    if (!s) return <NotFound label="宣传册章节" />
    return (
      <div className="stack">
        <Crumb parent="宣传册" />
        <Article title={s.title} summary={s.summary}>
          {s.blocks.map((b, i) => (
            <section className="card card-pad" key={i}>
              {b.heading && <div className="eyebrow" style={{ marginBottom: 10 }}>{b.heading}</div>}
              {b.paragraphs?.map((p, j) => (
                <p style={{ margin: '0 0 10px', lineHeight: 1.8 }} key={j}><InlineRich text={p} /></p>
              ))}
              {b.steps && (
                <ol className="steps">
                  {b.steps.map((st, j) => (
                    <li key={j}>
                      <span className="steps-n num">{j + 1}</span>
                      <span className="steps-d" style={{ color: 'var(--ink)', paddingTop: 2 }}><InlineRich text={st} /></span>
                    </li>
                  ))}
                </ol>
              )}
              {b.bullets && (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                  {b.bullets.map((li, j) => (
                    <li style={{ lineHeight: 1.7 }} key={j}><InlineRich text={li} /></li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {s.note && <Note text={s.note} />}
        </Article>
      </div>
    )
  }

  if (kind === 'policy') {
    const p = POLICIES.find((x) => x.id === id)
    if (!p) return <NotFound label="政策文章" />
    return (
      <div className="stack">
        <Crumb parent="政策福利" />
        <Article title={p.title} summary={p.summary}>
          <section className="card card-pad">
            <div className="card-note" style={{ marginBottom: 14, display: 'grid', gap: 4 }}>
              <span>来源：{p.source}{p.docNo ? ` · ${p.docNo}` : ''} · 发布：{p.date}</span>
              {p.url
                ? <span style={{ wordBreak: 'break-all' }}>原文链接：<a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--green-700)' }}>{p.url}</a></span>
                : <span>原文链接：甲方内部整理资料，未附公开链接</span>}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {p.body.map((t, i) => (
                <p style={{ margin: 0, lineHeight: 1.8 }} key={i}><InlineRich text={t} /></p>
              ))}
            </div>
          </section>
          <Note
            text={`本文整理自公开政策信息，仅供参考，办理条件与标准以政府部门官方最新发布为准。${p.aiNote ? '（原文标注：部分内容可能由 AI 生成）' : ''} 咨询热线：民政 12349 · 医保 12393。`}
          />
        </Article>
      </div>
    )
  }

  if (kind === 'expert') {
    const e = EXPERTS.find((x) => x.id === id)
    if (!e) return <NotFound label="专家" />
    return (
      <div className="stack">
        <Crumb parent="专家资源" />
        <Article title={`${e.name} · ${e.hospital}`} summary={e.department}>
          <section className="card card-pad">
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, lineHeight: 1.8 }}>
                {e.name}，{e.hospital} {e.department}。所在医院为深圳本地三甲医院，可通过官方渠道预约康复医学科门诊。
              </p>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>官方预约渠道</div>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                  {EXPERT_BOOKING_CHANNELS.map((c) => <li style={{ lineHeight: 1.7 }} key={c}>{c}</li>)}
                </ul>
              </div>
            </div>
          </section>
          <Note text={EXPERT_NOTICE} />
        </Article>
      </div>
    )
  }

  return <NotFound label="页面" />
}

function Crumb({ parent }: { parent: string }) {
  return (
    <div className="crumb">
      <Link to="/patient">今日</Link>
      <span>/</span>
      <Link to="/patient/resources">宣传册·政策·专家</Link>
      <span>/</span>
      <span>{parent}</span>
    </div>
  )
}

function Article({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <>
      <section className="card card-pad">
        <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{title}</h1>
        <p className="card-note" style={{ marginTop: 4 }}>{summary}</p>
      </section>
      {children}
    </>
  )
}

function Note({ text }: { text: string }) {
  return (
    <div className="alert">
      <span style={{ flex: 'none', marginTop: 2 }}><IconAlert size={15} /></span>
      <span>{text}</span>
    </div>
  )
}

function NotFound({ label }: { label: string }) {
  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient/resources">宣传册·政策·专家</Link>
        <span>/</span>
      </div>
      <section className="card card-pad">
        <span className="card-note">没有找到这条{label} <IconChevron size={12} /></span>
      </section>
    </div>
  )
}
