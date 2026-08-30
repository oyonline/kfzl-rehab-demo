/**
 * 数据库行 → API 对象。
 *
 * 库里是 snake_case + JSON 文本列，对外必须是 src/data/types.ts 里的形状 ——
 * 那是双端共用契约，前端 16 个消费方按它写的，不能因为换了存储就变形。
 */

const J = (s: unknown) => {
  if (typeof s !== 'string') return []
  try { return JSON.parse(s) } catch { return [] }
}
const B = (v: unknown) => v === 1 || v === true

export const toCheckIn = (r: any) => ({
  id: r.id, patientId: r.patient_id, taskId: r.task_id, date: r.date,
  status: r.status, at: r.at ?? undefined, note: r.note ?? undefined,
  uploadId: r.upload_id ?? undefined,
})

export const toVital = (r: any) => ({
  id: r.id, patientId: r.patient_id, date: r.date, time: r.time,
  systolic: r.systolic, diastolic: r.diastolic, by: r.by, at: r.at,
})

export const toUpload = (r: any) => ({
  id: r.id, patientId: r.patient_id, taskId: r.task_id, date: r.date,
  filename: r.filename, sizeLabel: r.size_label, uploadedAt: r.uploaded_at,
  playbackVideoId: r.playback_video_id, origin: r.origin,
})

export const toMessage = (r: any) => ({
  id: r.id, patientId: r.patient_id, role: r.role, text: r.text,
  at: r.at,
  answerSource: r.answer_source ?? undefined,
  externalText: r.external_text ?? undefined,
  basis: J(r.basis).length ? J(r.basis) : undefined,
  escalated: B(r.escalated) || undefined,
})

export const toGuidance = (r: any) => ({
  id: r.id, patientId: r.patient_id, therapistName: r.therapist_name,
  at: r.at, text: r.text,
  aboutDate: r.about_date ?? undefined,
  aboutTaskId: r.about_task_id ?? undefined,
  readByFamily: B(r.read_by_family),
})

export const toEscalation = (r: any) => ({
  id: r.id, patientId: r.patient_id, at: r.at, source: r.source,
  question: r.question, context: J(r.context),
  taskId: r.task_id ?? undefined,
  status: r.status,
  answer: r.answer ?? undefined,
  answeredAt: r.answered_at ?? undefined,
  therapistName: r.therapist_name ?? undefined,
})

/* ---------- 稳定层：档案、计划、内容 ---------- */

const JJ = (s: unknown) => {
  if (typeof s !== 'string') return []
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] }
}

export const toTaskDef = (r: any) => ({
  id: r.id, patientId: r.patient_id, kind: r.kind, title: r.title,
  scheduledTime: r.scheduled_time, instruction: r.instruction ?? '',
  cautions: JJ(r.cautions),
  videoId: r.video_id ?? undefined,
  reps: r.reps ?? undefined,
  durationMin: r.duration_min ?? undefined,
  requiresVideoUpload: r.requires_video_upload === 1 || undefined,
  origin: r.origin,
})

export const toVideo = (r: any) => ({
  id: r.id, title: r.title, category: r.category,
  src: r.src ?? undefined, poster: r.poster ?? undefined,
  target: r.target ?? undefined, goal: r.goal ?? undefined,
  cautions: JJ(r.cautions).length ? JJ(r.cautions) : undefined,
  durationSec: r.duration_sec ?? undefined,
  origin: r.origin,
})

export const toReminder = (r: any) => ({
  id: r.id, time: r.time, text: r.text,
  taskId: r.task_id ?? undefined,
  highlight: r.highlight === 1 || undefined,
})

export const toGuidanceCard = (r: any) => ({
  id: r.id, title: r.title, summary: r.summary ?? '',
  items: JJ(r.items),
  alert: r.alert ?? undefined,
  relatedVideoId: r.related_video_id ?? undefined,
})

export const toPresetQA = (r: any) => ({
  id: r.id, question: r.question,
  basis: JJ(r.basis),
  external: JJ(r.external).length ? JJ(r.external) : undefined,
  answer: JJ(r.answer),
  escalate: r.escalate === 1,
  escalateHint: r.escalate_hint ?? undefined,
})

/** 完整患者档案，形状对齐 src/data/types.ts 的 Patient */
export function toPatient(p: any, parts: {
  diagnosis: any; func: any; goals: any; contact: any
  meds: any[]; assessments: any[]; admission: any; events: any[]
}) {
  const { diagnosis: d, func: f, goals: g, contact: c } = parts
  return {
    id: p.id, name: p.name, avatar: p.avatar ?? '', ageBand: p.age_band, gender: p.gender,
    heightCm: p.height_cm, weightKg: p.weight_kg,
    livingSituation: p.living_situation ?? '',
    caregiver: { name: c?.caregiver_name ?? '', relation: c?.caregiver_relation ?? '' },
    diagnosis: {
      strokeType: d?.stroke_type ?? '', onsetDate: d?.onset_date ?? '',
      stage: d?.stage ?? '', comorbidities: JJ(d?.comorbidities),
    },
    functionStatus: {
      affectedSide: f?.affected_side ?? '', mobility: f?.mobility ?? '',
      swallowing: f?.swallowing ?? '', cognition: f?.cognition ?? '', risks: JJ(f?.risks),
    },
    psychosocial: p.psychosocial ?? undefined,
    medications: parts.meds.map((m) => ({
      id: m.id, name: m.name, dose: m.dose, times: JJ(m.times),
      notes: m.notes ?? undefined, confirmed: m.confirmed === 1,
    })),
    assessments: parts.assessments.map((a) => ({
      name: a.name, value: a.value, level: a.level ?? undefined,
      tile: a.tile_label ? { label: a.tile_label, value: a.tile_value, note: a.tile_note } : undefined,
      date: a.date, assessor: a.assessor ?? '', note: a.note ?? '',
      visibleToFamily: a.visible_to_family === 1,
    })),
    goals: { shortTerm: JJ(g?.short_term), nextReviewDate: g?.next_review_date ?? '' },
    admission: parts.admission ? {
      admittedOn: parts.admission.admitted_on, dischargedOn: parts.admission.discharged_on,
      facility: parts.admission.facility, department: parts.admission.department,
      chiefComplaint: parts.admission.chief_complaint,
      admissionDiagnosis: JJ(parts.admission.admission_diagnosis),
      course: parts.admission.course, dischargeStatus: parts.admission.discharge_status,
      dischargeOrders: JJ(parts.admission.discharge_orders),
    } : undefined,
    careEvents: parts.events.map((e) => ({
      date: e.date, kind: e.kind, title: e.title, detail: e.detail ?? '',
    })),
    emergencyContact: {
      name: c?.emergency_name ?? '', relation: c?.emergency_relation ?? '',
      phoneMasked: c?.emergency_phone ?? '',
    },
    assistiveDevices: JJ(c?.assistive_devices),
    communication: p.communication ?? '',
    pastHistory: JJ(c?.past_history),
    origin: p.origin,
  }
}
