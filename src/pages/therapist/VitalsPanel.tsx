import { useState } from 'react'
import {BP_SAFE, isBpAbnormal} from '../../data/seed'
import { usePatientData } from '../../data/context'
import { addGuidance, useDemoState } from '../../store/store'
import { BpChart } from '../../components/BpChart'
import { IconAlert, IconCheck, IconSend } from '../../components/Icons'

/**
 * 康复师端·健康数据（甲方需求书 3.5「异常预警（双端提醒）」）。
 *
 * 原文：「当录入的血压数值超出安全范围时…同时同步提醒康复师端，
 * 康复师可远程看到异常数据并主动联系家属」。
 *
 * 这里就是那条闭环的后半段：家属录入超标 → 康复师在这页看到并标红
 * → 直接回写指导 → 家属端收到。用的是与打卡回写完全相同的机制，
 * 不为血压另起一套。
 */
export function VitalsPanel() {
  const { patient, therapist } = usePatientData()
  const state = useDemoState()
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState(false)

  const records = [...state.vitals].sort((a, b) => a.at.localeCompare(b.at))
  const abnormal = records.filter(isBpAbnormal)
  const latest = records[records.length - 1]
  const latestBad = latest ? isBpAbnormal(latest) : false

  function send() {
    const text = draft.trim()
    if (!text) return
    addGuidance(text, therapist.name)
    setDraft('')
    setSent(true)
  }

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="stats">
          <Stat k="记录次数" v={`${records.length}`} unit="次" />
          <Stat k="超出安全范围" v={`${abnormal.length}`} unit="次" bad={abnormal.length > 0} />
          <Stat k="最近一次" v={latest ? `${latest.systolic}/${latest.diastolic}` : '—'} unit="mmHg" bad={latestBad} />
          <Stat k="安全范围" v={`${BP_SAFE.sysMin}–${BP_SAFE.sysMax}`} unit={`/ ${BP_SAFE.diaMin}–${BP_SAFE.diaMax}`} />
        </div>
      </section>

      {latestBad && latest && (
        <section className="card card-pad alert-card">
          <div className="alert-hd"><IconAlert size={17} /> {patient.name}最近一次血压超出安全范围</div>
          <div className="alert-big num">{latest.systolic} / {latest.diastolic} <span>mmHg</span></div>
          <p style={{ fontSize: 'var(--t-sm)', lineHeight: 1.65 }}>
            {latest.date} {latest.time} 由{latest.by}录入。家属端已提示复测并明确不要自行加药。
          </p>

          <div className="composer" style={{ borderTop: 'none', paddingTop: 14 }}>
            <textarea
              className="ta"
              rows={3}
              placeholder={`给${patient.caregiver.name}写一条指导，会直接推到家属端…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn" onClick={send} disabled={!draft.trim()}><IconSend size={14} /> 发送指导</button>
          </div>
          {sent && <p className="card-note" style={{ marginTop: 8, color: 'var(--ok)' }}><IconCheck size={11} /> 已发送，家属端会看到未读提示</p>}
        </section>
      )}

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">血压趋势</div>
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>近期记录</h2>
          </div>
          <span className="bp-legend"><i className="dot-sys" />高压<i className="dot-dia" />低压<i className="dot-bad" />超范围</span>
        </div>
        <BpChart records={records} />
      </section>

      <section className="card card-pad">
        <div className="eyebrow">全部记录</div>
        <div className="bp-rows">
          {[...records].reverse().map((r) => {
            const bad = isBpAbnormal(r)
            return (
              <div className="bp-row" key={r.id} data-bad={bad}>
                <span className="bp-when num">{Number(r.date.slice(5, 7))}/{Number(r.date.slice(8, 10))} {r.time}</span>
                <span className="bp-val num">{r.systolic} / {r.diastolic}</span>
                <span className="bp-by">{r.by}</span>
                {bad
                  ? <span className="chip" style={{ background: 'var(--miss-bg)', color: 'var(--miss)' }}>超出范围</span>
                  : <span className="chip chip-ok"><IconCheck size={10} /> 正常</span>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ k, v, unit, bad }: { k: string; v: string; unit?: string; bad?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className="stat-v num" style={bad ? { color: 'var(--miss)' } : undefined}>
        {v}{unit && <small>{unit}</small>}
      </div>
    </div>
  )
}
