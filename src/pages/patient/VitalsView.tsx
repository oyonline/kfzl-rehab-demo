import { useState } from 'react'
import { Link } from 'react-router-dom'
import {BP_SAFE, isBpAbnormal} from '../../data/seed'
import { usePatientData } from '../../data/context'
import { addVital, useDemoState } from '../../store/store'
import { BpChart } from '../../components/BpChart'
import { IconAlert, IconCheck, IconHeart } from '../../components/Icons'

/**
 * 健康数据（甲方需求书 3.5）。
 *
 * 只做血压。录入项越多，45 秒的演示环节越容易卡在填表上；
 * 心率、血氧在她的评估表里有基线值，但每日不需家属反复录。
 *
 * 「不提供医疗诊断或用药指导」是甲方原文要求，也与本项目一贯边界一致：
 * 超标提示只给「当前值 / 安全范围 / 休息后复测 / 已同步康复师」，
 * 不判断高血压分级，更不建议加药。
 */
export function VitalsView() {
  const { patient, therapist } = usePatientData()
  const state = useDemoState()
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [err, setErr] = useState('')

  const records = [...state.vitals].sort((a, b) => a.at.localeCompare(b.at))
  const latest = records[records.length - 1]
  const latestBad = latest ? isBpAbnormal(latest) : false

  function submit() {
    const s = Number(sys)
    const d = Number(dia)
    if (!Number.isFinite(s) || !Number.isFinite(d) || !sys.trim() || !dia.trim()) {
      setErr('请把高压和低压都填上')
      return
    }
    if (s < 50 || s > 260 || d < 30 || d > 180) {
      setErr('数值超出血压计的常见量程，请核对后重填')
      return
    }
    if (d >= s) {
      setErr('低压不应大于或等于高压，请核对')
      return
    }
    setErr('')
    addVital(s, d)
    setSys('')
    setDia('')
  }

  return (
    <div className="stack">
      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">健康数据</div>
            <h2 className="card-title">记录 {patient.name} 的血压</h2>
          </div>
          <span className="card-note">安全范围 {BP_SAFE.sysMin}–{BP_SAFE.sysMax} / {BP_SAFE.diaMin}–{BP_SAFE.diaMax} mmHg</span>
        </div>

        <div className="bp-form">
          <label className="bp-field">
            <span>高压（收缩压）</span>
            <input className="input num" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value.replace(/\D/g, ''))} placeholder="118" />
          </label>
          <span className="bp-sep">/</span>
          <label className="bp-field">
            <span>低压（舒张压）</span>
            <input className="input num" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))} placeholder="74" />
          </label>
          <span className="bp-unit">mmHg</span>
          <button className="btn btn-lg" onClick={submit}><IconCheck size={13} /> 记录</button>
        </div>
        {err && <p className="card-note" style={{ color: 'var(--miss)', marginTop: 10 }}>{err}</p>}

        <p className="card-note" style={{ marginTop: 12 }}>
          测前安静休息 5 分钟，坐位、手臂与心脏同高。测完点「记录」，{therapist.name} 康复师那边会同步看到。
        </p>
      </section>

      {/* 超标预警 —— 只给数值、范围与复测建议，不做诊断、不谈用药 */}
      {latestBad && latest && (
        <section className="card card-pad alert-card">
          <div className="alert-hd"><IconAlert size={17} /> 这次的血压超出安全范围</div>
          <div className="alert-big num">{latest.systolic} / {latest.diastolic} <span>mmHg</span></div>
          <ul className="alert-list">
            <li>安全范围是 {BP_SAFE.sysMin}–{BP_SAFE.sysMax} / {BP_SAFE.diaMin}–{BP_SAFE.diaMax} mmHg。</li>
            <li>请让她<strong>安静休息 5–10 分钟后再测一次</strong>，两次数值都记下来。</li>
            <li><strong>不要自行加药或调整剂量</strong>——用法用量须由医师或康复师决定。</li>
            <li>已同步给 {therapist.name} 康复师，她会在工作台看到这条记录。</li>
          </ul>
          <div className="alert-emg">
            出现剧烈头痛、视物模糊、胸闷、恶心呕吐，或一侧肢体较平时明显无力，<strong>不要等待，立即就医</strong>。
          </div>
        </section>
      )}

      <section className="card card-pad">
        <div className="card-hd">
          <div>
            <div className="eyebrow">近期趋势</div>
            <h2 className="card-title" style={{ fontSize: 'var(--t-md)' }}>共 {records.length} 次记录</h2>
          </div>
          <span className="bp-legend">
            <i className="dot-sys" />高压<i className="dot-dia" />低压<i className="dot-bad" />超范围
          </span>
        </div>
        <BpChart records={records} />
      </section>

      <section className="card card-pad">
        <div className="eyebrow">记录明细</div>
        <div className="bp-rows">
          {[...records].reverse().slice(0, 10).map((r) => {
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
        <p className="card-note" style={{ marginTop: 14 }}>
          <IconHeart size={13} /> 每日 7:00 与 20:30 各测一次是计划里的任务，见 <Link to="/patient">今日安排</Link>。
        </p>
      </section>
    </div>
  )
}
