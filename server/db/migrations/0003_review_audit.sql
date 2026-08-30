-- 0003 —— 让「训练分步说明」也能被审核，并给审计表补索引。
--
-- README 标了三个 REVIEW REQUIRED 文件：qa.ts / guidance.ts / videoSteps.ts。
-- 前两者进库时已带 review_status，唯独分步说明没有 —— 而它恰是红线最硬的一条
-- （v-transfer 的步骤为本项目起草，甲方无对应内容可替换）。
--
-- 审核状态挂在 videos 上而非 video_steps 上：康复师审的是「这个训练的说明整体
-- 对不对」，不是逐条勾选；分步之间有先后依赖，拆开审没有意义。
ALTER TABLE videos ADD COLUMN steps_review_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN steps_reviewed_by TEXT;
ALTER TABLE videos ADD COLUMN steps_reviewed_at TEXT;

-- 审计页按时间倒序翻页，没有这个索引会全表扫
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
