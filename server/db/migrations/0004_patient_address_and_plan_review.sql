-- 患者居住地址与个体化康复计划审核状态。
-- 待审核计划只在康复师档案中展示，不进入 task_defs，因而不会向家属端下发任务。

ALTER TABLE patients ADD COLUMN address TEXT;

ALTER TABLE patient_goals ADD COLUMN long_term TEXT NOT NULL DEFAULT '[]';
ALTER TABLE patient_goals ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE patient_goals ADD COLUMN plan_date TEXT;
ALTER TABLE patient_goals ADD COLUMN plan_items TEXT NOT NULL DEFAULT '[]';
ALTER TABLE patient_goals ADD COLUMN plan_source_note TEXT;
