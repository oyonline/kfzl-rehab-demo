-- 0001_init —— 产品线初始表结构
-- 依据 docs/后端与知识库方案.md §2，字段语义以 src/data/types.ts 为准。
--
-- 约定：
--   id 用 TEXT（沿用现有 'p-001' / 'task-med-morning' 这类可读 id，不换整型）
--   布尔用 INTEGER 0/1（SQLite 无 BOOLEAN）
--   数组/对象用 TEXT 存 JSON，读写走 json_extract / json_each
--   日期 'YYYY-MM-DD'，时刻 'HH:mm'，时间戳 ISO 8601 字符串

PRAGMA foreign_keys = ON;

/* ================= 身份与授权 ================= */

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('family','therapist','admin')),
  display_name  TEXT NOT NULL,
  title         TEXT,                      -- 康复师职称，家属为 NULL
  phone_masked  TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- 谁能看谁 —— 多患者多康复师的行级权限根据地。
-- 每个涉及 patient 的接口都必须查这张表，无记录即 403。
CREATE TABLE patient_members (
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  relation   TEXT,                                  -- '女儿' / '主管康复师'
  access     TEXT NOT NULL CHECK (access IN ('owner','primary','assist','read')),
  granted_at TEXT NOT NULL,
  granted_by TEXT REFERENCES users(id),
  PRIMARY KEY (patient_id, user_id)
);
CREATE INDEX idx_members_user ON patient_members(user_id);

/* ================= 患者档案（稳定层） ================= */

CREATE TABLE patients (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  gender               TEXT NOT NULL CHECK (gender IN ('男','女')),
  age_band             TEXT NOT NULL,
  height_cm            INTEGER,
  weight_kg            REAL,
  living_situation     TEXT,
  psychosocial         TEXT,
  communication        TEXT,
  avatar               TEXT,
  primary_therapist_id TEXT REFERENCES users(id),
  origin               TEXT NOT NULL DEFAULT 'synthetic',
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
CREATE INDEX idx_patients_therapist ON patients(primary_therapist_id);

CREATE TABLE patient_diagnosis (
  patient_id    TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  stroke_type   TEXT,
  onset_date    TEXT,
  stage         TEXT,
  comorbidities TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE patient_function (
  patient_id    TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  affected_side TEXT,
  mobility      TEXT,
  swallowing    TEXT,
  cognition     TEXT,
  risks         TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE patient_goals (
  patient_id       TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  short_term       TEXT NOT NULL DEFAULT '[]',
  next_review_date TEXT
);

CREATE TABLE patient_contact (
  patient_id         TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  emergency_name     TEXT,
  emergency_relation TEXT,
  emergency_phone    TEXT,                 -- 已脱敏，不存完整号码
  caregiver_name     TEXT,
  caregiver_relation TEXT,
  assistive_devices  TEXT NOT NULL DEFAULT '[]',
  past_history       TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE medications (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dose       TEXT NOT NULL,                -- 未经专业确认时为 '待专业确认'，不由本项目生成
  times      TEXT NOT NULL DEFAULT '[]',
  notes      TEXT,
  confirmed  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_meds_patient ON medications(patient_id);

CREATE TABLE assessments (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  value             TEXT NOT NULL,
  level             TEXT,
  tile_label        TEXT,
  tile_value        TEXT,
  tile_note         TEXT,
  date              TEXT NOT NULL,
  assessor          TEXT,
  note              TEXT,
  visible_to_family INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_assess_patient ON assessments(patient_id, date DESC);

CREATE TABLE admissions (
  id                  TEXT PRIMARY KEY,
  patient_id          TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admitted_on         TEXT,
  discharged_on       TEXT,
  facility            TEXT,
  department          TEXT,
  chief_complaint     TEXT,
  admission_diagnosis TEXT NOT NULL DEFAULT '[]',
  course              TEXT,
  discharge_status    TEXT,
  discharge_orders    TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_adm_patient ON admissions(patient_id);

CREATE TABLE care_events (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('admission','inpatient','discharge','homecare','assessment','upcoming')),
  title      TEXT NOT NULL,
  detail     TEXT
);
CREATE INDEX idx_care_patient ON care_events(patient_id, date);

/* ================= 计划与内容 ================= */

-- active_from / active_to：康复计划随复评调整，历史打卡须能对上当时生效的那版计划。
-- active_to 为 NULL 表示当前生效。
CREATE TABLE task_defs (
  id                   TEXT PRIMARY KEY,
  patient_id           TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL CHECK (kind IN ('medication','training','record')),
  title                TEXT NOT NULL,
  scheduled_time       TEXT NOT NULL,
  instruction          TEXT,
  cautions             TEXT NOT NULL DEFAULT '[]',
  video_id             TEXT REFERENCES videos(id),
  reps                 TEXT,
  duration_min         INTEGER,
  requires_video_upload INTEGER NOT NULL DEFAULT 0,
  origin               TEXT NOT NULL DEFAULT 'therapist_confirmed',
  confirmed_on         TEXT,
  active_from          TEXT NOT NULL,
  active_to            TEXT
);
CREATE INDEX idx_tasks_patient ON task_defs(patient_id, active_from, active_to);

CREATE TABLE reminders (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  time       TEXT NOT NULL,
  text       TEXT NOT NULL,
  task_id    TEXT REFERENCES task_defs(id),
  highlight  INTEGER NOT NULL DEFAULT 0,
  enabled    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_reminders_patient ON reminders(patient_id, time);

-- 视频为全局内容库，不属于某个患者
CREATE TABLE videos (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL,
  src          TEXT,
  poster       TEXT,
  target       TEXT,
  goal         TEXT,
  cautions     TEXT NOT NULL DEFAULT '[]',
  duration_sec INTEGER,
  origin       TEXT NOT NULL DEFAULT 'placeholder',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE video_steps (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  seq      INTEGER NOT NULL,
  title    TEXT NOT NULL,
  detail   TEXT NOT NULL,
  PRIMARY KEY (video_id, seq)
);

-- review_status 对应 README 里那三个 ⚠️ REVIEW REQUIRED 文件。
-- 搬进库后康复师审核不再需要改代码。
CREATE TABLE guidance_articles (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  summary          TEXT,
  items            TEXT NOT NULL DEFAULT '[]',
  alert            TEXT,
  related_video_id TEXT REFERENCES videos(id),
  origin           TEXT NOT NULL DEFAULT 'team_reviewed',
  review_status    TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by      TEXT REFERENCES users(id),
  reviewed_at      TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT NOT NULL
);

CREATE TABLE preset_qa (
  id            TEXT PRIMARY KEY,
  question      TEXT NOT NULL,
  basis         TEXT NOT NULL DEFAULT '[]',
  external      TEXT NOT NULL DEFAULT '[]',
  answer        TEXT NOT NULL DEFAULT '[]',
  escalate      INTEGER NOT NULL DEFAULT 0,
  escalate_hint TEXT,
  origin        TEXT NOT NULL DEFAULT 'team_reviewed',
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by   TEXT REFERENCES users(id),
  reviewed_at   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

/* ================= 动态层 ================= */

CREATE TABLE check_ins (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  task_id     TEXT NOT NULL REFERENCES task_defs(id),
  date        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('pending','done','missed','difficulty')),
  note        TEXT,
  at          TEXT,
  upload_id   TEXT,
  recorded_by TEXT REFERENCES users(id),
  UNIQUE (patient_id, task_id, date)
);
CREATE INDEX idx_checkins_patient_date ON check_ins(patient_id, date);

CREATE TABLE vitals (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  time        TEXT NOT NULL,
  systolic    INTEGER NOT NULL,
  diastolic   INTEGER NOT NULL,
  by          TEXT NOT NULL,
  at          TEXT NOT NULL,
  recorded_by TEXT REFERENCES users(id)
);
CREATE INDEX idx_vitals_patient_date ON vitals(patient_id, date, at);

-- 模拟上传：只存元数据，不落文件、不上传内容（v0.2 §4.2 裁决，产品线沿用至真实上传实现）
CREATE TABLE uploads (
  id                 TEXT PRIMARY KEY,
  patient_id         TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  task_id            TEXT NOT NULL REFERENCES task_defs(id),
  date               TEXT NOT NULL,
  filename           TEXT NOT NULL,
  size_label         TEXT,
  playback_video_id  TEXT REFERENCES videos(id),
  uploaded_at        TEXT NOT NULL,
  uploaded_by        TEXT REFERENCES users(id),
  origin             TEXT NOT NULL DEFAULT 'simulated'
);
CREATE INDEX idx_uploads_patient ON uploads(patient_id, date);

CREATE TABLE messages (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('family','ai','therapist')),
  text           TEXT NOT NULL,
  external_text  TEXT,
  answer_source  TEXT CHECK (answer_source IN ('preset','model','preset_fallback','kb_rag')),
  basis          TEXT NOT NULL DEFAULT '[]',
  sources        TEXT NOT NULL DEFAULT '[]',   -- 检索命中的 kb_chunk 摘要，见 §4.4
  escalated      INTEGER NOT NULL DEFAULT 0,
  at             TEXT NOT NULL,
  author_user_id TEXT REFERENCES users(id)
);
CREATE INDEX idx_messages_patient ON messages(patient_id, at);

CREATE TABLE guidances (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_user_id TEXT REFERENCES users(id),
  therapist_name    TEXT NOT NULL,
  text              TEXT NOT NULL,
  about_task_id     TEXT REFERENCES task_defs(id),
  about_date        TEXT,
  read_by_family    INTEGER NOT NULL DEFAULT 0,
  read_at           TEXT,
  at                TEXT NOT NULL
);
CREATE INDEX idx_guidances_patient ON guidances(patient_id, at DESC);

CREATE TABLE escalations (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('chat','task')),
  task_id     TEXT REFERENCES task_defs(id),
  question    TEXT NOT NULL,
  context     TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered')),
  answer      TEXT,
  answered_at TEXT,
  answered_by TEXT REFERENCES users(id),
  raised_by   TEXT REFERENCES users(id),
  at          TEXT NOT NULL
);
CREATE INDEX idx_esc_status ON escalations(status, at DESC);
CREATE INDEX idx_esc_patient ON escalations(patient_id, at DESC);

/* ================= 知识库 ================= */

CREATE TABLE kb_collections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  -- 命中该集合时答案强制附加的声明。政策类因时效性与 AI 来源占比高必须带。
  disclaimer  TEXT,
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- provenance 三级互斥，ai_flagged 优先于 unattributed 判定（方案 §4.2）。
-- weight 是检索排序乘数，可逐篇覆盖集合默认值。
CREATE TABLE kb_documents (
  id             TEXT PRIMARY KEY,
  collection_id  TEXT NOT NULL REFERENCES kb_collections(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  source_path    TEXT NOT NULL,
  author         TEXT,
  source_note    TEXT,
  provenance     TEXT NOT NULL CHECK (provenance IN ('attributed','unattributed','ai_flagged')),
  review_status  TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by    TEXT REFERENCES users(id),
  reviewed_at    TEXT,
  enabled        INTEGER NOT NULL DEFAULT 1,
  weight         REAL NOT NULL DEFAULT 1.0,
  effective_date TEXT,                       -- 政策类时效起点，过期自动降权
  char_count     INTEGER NOT NULL DEFAULT 0,
  content_hash   TEXT NOT NULL,
  dup_group      TEXT,                       -- 近重复簇标识，同组 topK 内只保留最高分 1 条
  imported_at    TEXT NOT NULL
);
CREATE INDEX idx_kbdoc_collection ON kb_documents(collection_id, enabled);
CREATE INDEX idx_kbdoc_dup ON kb_documents(dup_group);

CREATE TABLE kb_chunks (
  id         TEXT PRIMARY KEY,
  doc_id     TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  seq        INTEGER NOT NULL,
  heading    TEXT,
  text       TEXT NOT NULL,
  bigram     TEXT NOT NULL,                  -- 二字滑窗分词串，供 FTS5 索引（中文检索方案 §4.3）
  char_count INTEGER NOT NULL
);
CREATE INDEX idx_chunks_doc ON kb_chunks(doc_id, seq);

-- 外部内容表：索引 kb_chunks.bigram，用 unicode61 按空格切词，BM25 由 FTS5 提供
CREATE VIRTUAL TABLE kb_chunks_fts USING fts5(
  bigram,
  content = 'kb_chunks',
  content_rowid = 'rowid',
  tokenize = 'unicode61'
);

CREATE TRIGGER kb_chunks_ai AFTER INSERT ON kb_chunks BEGIN
  INSERT INTO kb_chunks_fts(rowid, bigram) VALUES (new.rowid, new.bigram);
END;
CREATE TRIGGER kb_chunks_ad AFTER DELETE ON kb_chunks BEGIN
  INSERT INTO kb_chunks_fts(kb_chunks_fts, rowid, bigram) VALUES ('delete', old.rowid, old.bigram);
END;
CREATE TRIGGER kb_chunks_au AFTER UPDATE ON kb_chunks BEGIN
  INSERT INTO kb_chunks_fts(kb_chunks_fts, rowid, bigram) VALUES ('delete', old.rowid, old.bigram);
  INSERT INTO kb_chunks_fts(rowid, bigram) VALUES (new.rowid, new.bigram);
END;

CREATE TABLE kb_search_log (
  id         TEXT PRIMARY KEY,
  question   TEXT NOT NULL,
  patient_id TEXT,
  user_id    TEXT,
  hits       TEXT NOT NULL DEFAULT '[]',
  latency_ms INTEGER,
  at         TEXT NOT NULL
);

/* ================= 审计 ================= */

CREATE TABLE audit_log (
  id        TEXT PRIMARY KEY,
  user_id   TEXT REFERENCES users(id),
  action    TEXT NOT NULL,
  entity    TEXT NOT NULL,
  entity_id TEXT,
  detail    TEXT NOT NULL DEFAULT '{}',
  ip        TEXT,
  at        TEXT NOT NULL
);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id, at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, at DESC);
