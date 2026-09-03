import { Link } from 'react-router-dom'
import { BROCHURE, EXPERTS, POLICIES, POLICY_CATEGORIES } from '../../data/resources'
import { IconChevron, IconFile, IconShield, IconUser } from '../../components/Icons'

/**
 * 宣传册 · 政策 · 专家 —— 一个入口、内部分三块（2026-08-31 用户裁决）。
 *
 * 三块内容都来自甲方交付资料，列表 → 详情：
 * - 宣传册：《模块六 电子宣传册 初稿.pdf》六个章节；
 * - 政策：模块七 13 篇，按甲方交付的四个文件夹分类，
 *   其中 10 篇原文自带 AI 生成标注，详情页如实透出；
 * - 专家：需求书 3.8 的 6 位深圳专家（只有姓名与医院是甲方数据）。
 */
export function ResourcesView() {
  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient">今日</Link>
        <span>/</span>
        <span>宣传册·政策·专家</span>
      </div>

      <section className="card card-pad">
        <div className="eyebrow">宣传册·政策·专家</div>
        <h2 className="card-title">服务介绍与政策福利查询</h2>
        <p className="card-note" style={{ marginTop: 6 }}>
          居家康复服务说明、深圳本地政策福利与三甲医院康复科专家预约渠道
        </p>
      </section>

      {/* —— 宣传册 —— */}
      <section className="stack">
        <div className="eyebrow" style={{ marginBottom: -6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconFile size={13} /> 电子宣传册（{BROCHURE.length} 节）
        </div>
        <div className="glist">
          {BROCHURE.map((s) => (
            <Link className="grow" to={`/patient/resources/brochure/${s.id}`} key={s.id}>
              <span className="grow-ico"><IconFile size={19} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="grow-t">{s.title}</span>
                <span className="grow-s">{s.summary}</span>
              </span>
              <span className="grow-go"><IconChevron /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* —— 政策福利 —— */}
      <section className="stack">
        <div className="eyebrow" style={{ marginBottom: -6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconShield size={13} /> 政策福利（{POLICIES.length} 篇）
        </div>
        {POLICY_CATEGORIES.map((cat) => {
          const group = POLICIES.filter((p) => p.category === cat)
          if (!group.length) return null
          return (
            <div className="stack" key={cat} style={{ gap: 10 }}>
              <div className="card-note" style={{ paddingLeft: 4 }}>{cat} · {group.length} 篇</div>
              <div className="glist">
                {group.map((p) => (
                  <Link className="grow" to={`/patient/resources/policy/${p.id}`} key={p.id}>
                    <span className="grow-ico"><IconShield size={19} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="grow-t">{p.title}</span>
                      <span className="grow-s">{p.summary}</span>
                      <span className="grow-m">
                        <span className="chip num">{p.date.slice(0, 7)}</span>
                        <span className="chip">{p.source}</span>
                      </span>
                    </span>
                    <span className="grow-go"><IconChevron /></span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
        <p className="card-note" style={{ paddingLeft: 4 }}>
          政策咨询热线：民政 12349 · 医保 12393。内容整理自政府官网与官方公众号公开信息，具体以官方最新发布为准。
        </p>
      </section>

      {/* —— 专家资源 —— */}
      <section className="stack">
        <div className="eyebrow" style={{ marginBottom: -6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconUser size={13} /> 康复专家资源（深圳三甲医院康复科，{EXPERTS.length} 位）
        </div>
        <div className="glist">
          {EXPERTS.map((e) => (
            <Link className="grow" to={`/patient/resources/expert/${e.id}`} key={e.id}>
              <span className="grow-ico"><IconUser size={19} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="grow-t">{e.name}<span className="card-note" style={{ marginLeft: 10 }}>{e.hospital}</span></span>
                <span className="grow-s">{e.department}</span>
              </span>
              <span className="grow-go"><IconChevron /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
