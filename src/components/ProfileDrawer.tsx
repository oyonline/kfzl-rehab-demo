import { useEffect } from 'react'
import { patient, therapist } from '../data/seed'
import type { CareEventKind } from '../data/types'
import { IconClose } from './Icons'

const KIND_LABEL: Record<CareEventKind, string> = {
  admission: '入院',
  inpatient: '住院',
  discharge: '出院',
  homecare: '居家',
  assessment: '评估',
  upcoming: '计划',
}

/**
 * 完整档案抽屉 —— 家属端与康复师端共用。
 *
 * 不做页面跳转：演示只有 2–3 分钟，跳走再跳回会打断讲解节奏。
 *
 * 评估结果一栏刻意不填数值：量表分值属专业判断，由康复师评估后录入，
 * 本项目不生成（见 KB v0.1 §6 D）。界面上呈现为"待录入"，这同时也
 * 体现了"专业人员保留评估权、AI 不代替评估"的产品主张。
 */
export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const a = patient.admission

  return (
    <>
      <div className="mask" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="完整康复档案">
        <header className="drawer-hd">
          <span className="avatar" style={{ width: 46, height: 46, fontSize: 19, marginBottom: 0 }}>
            {patient.name[0]}
          </span>
          <span>
            <div style={{ fontSize: 'var(--t-md)', fontWeight: 650 }}>{patient.name} · 康复档案</div>
            <div style={{ fontSize: 'var(--t-xs)', color: 'var(--ink-3)' }}>
              建档 2026-07-02 · 责任康复师 {therapist.name}
            </div>
          </span>
          <button className="drawer-close" onClick={onClose} aria-label="关闭"><IconClose /></button>
        </header>

        <div className="drawer-body">
          {/* 1 基本信息 */}
          <section className="sec">
            <div className="sec-t">基本信息</div>
            <dl className="kv">
              <dt>性别年龄</dt><dd>{patient.gender} · {patient.ageBand}</dd>
              <dt>居住情况</dt><dd>{patient.livingSituation}</dd>
              <dt>主要照护人</dt><dd>{patient.caregiver.name} · {patient.caregiver.relation}</dd>
              <dt>紧急联系</dt><dd>{patient.emergencyContact.name}（{patient.emergencyContact.relation}） · {patient.emergencyContact.phoneMasked}</dd>
              <dt>沟通注意</dt><dd>{patient.communication}</dd>
              <dt>辅具</dt><dd>{patient.assistiveDevices.join('、')}</dd>
            </dl>
          </section>

          {/* 2 入院记录 */}
          <section className="sec">
            <div className="sec-t">入院记录</div>
            <div className="sec-d">{a.facility} · {a.department} · {a.admittedOn} 至 {a.dischargedOn}（住院 14 天）</div>
            <dl className="kv">
              <dt>主诉</dt><dd>{a.chiefComplaint}</dd>
              <dt>入院诊断</dt><dd>{a.admissionDiagnosis.join('；')}</dd>
            </dl>
            <hr className="rule" />
            <div className="sec-t" style={{ fontSize: 'var(--t-sm)' }}>住院经过</div>
            <p className="prose" style={{ marginTop: 6 }}>{a.course}</p>
            <hr className="rule" />
            <div className="sec-t" style={{ fontSize: 'var(--t-sm)' }}>出院情况</div>
            <p className="prose" style={{ marginTop: 6 }}>{a.dischargeStatus}</p>
            <div className="sec-t" style={{ fontSize: 'var(--t-sm)', marginTop: 16 }}>出院医嘱</div>
            <ul className="olist" style={{ marginTop: 8 }}>
              {a.dischargeOrders.map((o) => <li key={o}><span>{o}</span></li>)}
            </ul>
          </section>

          {/* 3 诊疗与照护经过 */}
          <section className="sec">
            <div className="sec-t">诊疗与照护经过</div>
            <div className="sec-d">从发病入院到当前居家康复阶段</div>
            <div className="ct">
              {patient.careEvents.map((e) => (
                <div className="ct-item" key={e.date + e.title}>
                  <span className="ct-dot" data-kind={e.kind} />
                  <div className="ct-date num">{e.date} · {KIND_LABEL[e.kind]}</div>
                  <div className="ct-title">{e.title}</div>
                  <div className="ct-detail">{e.detail}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 4 功能与风险 */}
          <section className="sec">
            <div className="sec-t">功能情况与风险</div>
            <dl className="kv">
              <dt>患侧</dt><dd>{patient.functionStatus.affectedSide}</dd>
              <dt>活动转移</dt><dd>{patient.functionStatus.mobility}</dd>
              <dt>吞咽</dt><dd>{patient.functionStatus.swallowing}</dd>
              <dt>认知沟通</dt><dd>{patient.functionStatus.cognition}</dd>
              <dt>风险提示</dt><dd>{patient.functionStatus.risks.join(' · ')}</dd>
            </dl>
          </section>

          {/* 5 评估记录 */}
          <section className="sec">
            <div className="sec-t">评估记录</div>
            <div className="sec-d">由康复师现场评估后录入，系统不代为判定</div>
            <table className="tbl">
              <thead>
                <tr><th>评估项目</th><th>评估日期</th><th>评估人</th><th style={{ textAlign: 'right' }}>结果</th></tr>
              </thead>
              <tbody>
                {patient.assessments.map((as) => (
                  <tr key={as.name}>
                    <td style={{ fontWeight: 600 }}>{as.name}</td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{as.date}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{as.assessor}</td>
                    <td style={{ textAlign: 'right' }}><span className="chip">待录入</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 6 用药与既往史 */}
          <section className="sec">
            <div className="sec-t">用药与既往史</div>
            <div className="sec-d">用法用量以康复师／医师医嘱为准</div>
            <ul className="olist">
              {patient.medications.map((m) => (
                <li key={m.id}>
                  <span>
                    <strong style={{ fontWeight: 640 }}>{m.name}</strong>
                    <span style={{ color: 'var(--ink-3)' }}> · 每日 {m.times.join('、')}</span>
                    {m.notes && <div style={{ color: 'var(--ink-3)', fontSize: 'var(--t-xs)', marginTop: 2 }}>{m.notes}</div>}
                  </span>
                </li>
              ))}
            </ul>
            <hr className="rule" />
            <ul className="olist">
              {patient.pastHistory.map((h) => <li key={h}><span>{h}</span></li>)}
            </ul>
          </section>

          {/* 7 当前目标 */}
          <section className="sec">
            <div className="sec-t">本阶段康复目标</div>
            <div className="sec-d">由 {therapist.name} 康复师制定 · 下次复评 {patient.goals.nextReviewDate}</div>
            <ul className="olist">
              {patient.goals.shortTerm.map((g) => <li key={g}><span>{g}</span></li>)}
            </ul>
          </section>
        </div>
      </aside>
    </>
  )
}
