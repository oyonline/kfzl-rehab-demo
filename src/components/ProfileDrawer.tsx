import { useEffect } from 'react'
import { HOMECARE_START, patient, therapist } from '../data/seed'
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
 * 评估结果由康复师现场评估后录入，本项目不代为判定（KB v0.1 §6 D）。
 * 2026-08-29 起四张量表已有甲方康复团队的实测值，表格显示真实结果；
 * 仍未录入的项才显示「待录入」—— 原先是无论有没有值都写死「待录入」，
 * 导致填实后的分值在完整档案里根本看不到。
 */
export function ProfileDrawer({ open, onClose, audience }: { open: boolean; onClose: () => void; audience: 'family' | 'therapist' }) {
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
  // 契约里 visibleToFamily=false 的评估项不得展示给家属（v0.1 §6 D）
  const assessments = audience === 'family'
    ? patient.assessments.filter((x) => x.visibleToFamily)
    : patient.assessments

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
              建档 {HOMECARE_START} · 责任康复师 {therapist.name} · {therapist.title}
            </div>
          </span>
          <button className="drawer-close" onClick={onClose} aria-label="关闭"><IconClose /></button>
        </header>

        <div className="drawer-body">
          {/* 1 基本信息 + 功能情况（并排） */}
          <div className="sec-row">
          <section className="sec">
            <div className="sec-t">基本信息</div>
            <dl className="kv">
              <dt>性别年龄</dt><dd>{patient.gender} · {patient.ageBand}</dd>
              <dt>诊断</dt><dd>{patient.diagnosis.strokeType} · {patient.diagnosis.stage}</dd>
              <dt>合并疾病</dt><dd>{patient.diagnosis.comorbidities.join('、')}</dd>
              <dt>居住情况</dt><dd>{patient.livingSituation}</dd>
              {/* 照护人与紧急联系是同一个人，原先分两行写了两遍 */}
              <dt>照护人</dt>
              <dd>{patient.caregiver.name}（{patient.caregiver.relation}） · {patient.emergencyContact.phoneMasked}</dd>
              <dt>沟通注意</dt><dd>{patient.communication}</dd>
              <dt>辅具</dt><dd>{patient.assistiveDevices.join('、')}</dd>
            </dl>
          </section>

          {/* 功能情况 —— 与基本信息并排。风险与心理移到下方独立整块：
              一是这两栏原先一短一长，右栏比左栏高出一大截；
              二是风险是照护者真正要照着做的东西，值得单独一块，
              不该跟评估描述挤在同一张卡里用「·」串成一段。 */}
          <section className="sec">
            <div className="sec-t">功能情况</div>
            <dl className="kv">
              <dt>患侧</dt><dd>{patient.functionStatus.affectedSide}</dd>
              <dt>活动转移</dt><dd>{patient.functionStatus.mobility}</dd>
              <dt>吞咽</dt><dd>{patient.functionStatus.swallowing}</dd>
              <dt>认知沟通</dt><dd>{patient.functionStatus.cognition}</dd>
            </dl>
          </section>
          </div>

          {/* 风险与心理支持 */}
          <section className="sec">
            <div className="sec-t">风险与心理支持</div>
            <div className="sec-d">照护时需要一直放在心上的几条</div>
            <ul className="olist" style={{ marginTop: 4 }}>
              {/* 心理那条在下面单独展开，这里不再重复一遍 */}
              {patient.functionStatus.risks
                .filter((r) => !patient.psychosocial || !r.includes('情绪'))
                .map((r) => <li key={r}><span>{r}</span></li>)}
            </ul>
            {patient.psychosocial && (
              <>
                <hr className="rule" />
                <div className="sec-t" style={{ fontSize: 'var(--t-sm)' }}>心理状态</div>
                <p className="prose" style={{ marginTop: 6 }}>{patient.psychosocial}</p>
              </>
            )}
          </section>

          {/* 2 入院记录 */}
          <section className="sec">
            <div className="sec-t">入院记录</div>
            <div className="sec-d">{a.facility} · {a.department} · {a.admittedOn} 至 {a.dischargedOn}（住院 {Math.round((Date.parse(a.dischargedOn) - Date.parse(a.admittedOn)) / 86400000)} 天）</div>
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

          {/* 5 评估记录 */}
          <section className="sec">
            <div className="sec-t">评估记录</div>
            <div className="sec-d">
              由康复师现场评估后录入，系统不代为判定
              {audience === 'family' && patient.assessments.length > assessments.length &&
                ` · 另有 ${patient.assessments.length - assessments.length} 项供康复团队内部参考`}
            </div>
            <table className="tbl">
              <thead>
                <tr><th>评估项目</th><th>评估日期</th><th>评估人</th><th style={{ textAlign: 'right' }}>结果</th></tr>
              </thead>
              <tbody>
                {assessments.map((as) => (
                  <tr key={as.name}>
                    <td style={{ fontWeight: 600 }}>{as.name}</td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{as.date}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{as.assessor}</td>
                    <td style={{ textAlign: 'right' }}>
                      {as.value && as.value !== '待专业确认'
                        ? <><b>{as.value}</b>{as.level && <span className="tbl-lv">{as.level}</span>}</>
                        : <span className="chip">待录入</span>}
                    </td>
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
