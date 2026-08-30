-- 0002 —— 「今日须注意」按患者存。
--
-- 原先是 src/data/guidance.ts 里的模块级常量 CARE_ALERTS，写死了林奶奶的三条。
-- 它不是全局内容：每条都绑定具体评估结论（洼田 Ⅱ 级、尖足步态、Braden 16 分）
-- 与对应的照护动作，换个患者就完全不同。多患者要成立必须跟着患者走。
--
-- 与 patient_function.risks 的区别：risks 是风险名，care_alerts 是「怎么做」。
-- 两者都保留，页面用途不同。
ALTER TABLE patient_function ADD COLUMN care_alerts TEXT NOT NULL DEFAULT '[]';
