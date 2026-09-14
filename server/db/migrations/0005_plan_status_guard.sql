-- SQLite 无法在不重建表的情况下为 0004 已增加的列补 CHECK，
-- 用触发器对新写入和更新做同等的枚举守卫。
CREATE TRIGGER patient_goals_plan_status_insert_guard
BEFORE INSERT ON patient_goals
WHEN NEW.plan_status NOT IN ('none','pending','approved','rejected')
BEGIN
  SELECT RAISE(ABORT, 'invalid patient_goals.plan_status');
END;

CREATE TRIGGER patient_goals_plan_status_update_guard
BEFORE UPDATE OF plan_status ON patient_goals
WHEN NEW.plan_status NOT IN ('none','pending','approved','rejected')
BEGIN
  SELECT RAISE(ABORT, 'invalid patient_goals.plan_status');
END;
