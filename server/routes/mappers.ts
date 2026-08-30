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
