-- 新增 15 名分层虚构患者。全新库在迁移后由 runSeed 完整灌入；
-- 已有库利用现有演示账号的 123456 哈希与盐做幂等补录，不保存明文密码。

CREATE TEMP TABLE demo_roster (
  id TEXT PRIMARY KEY, username TEXT, name TEXT, gender TEXT, age_band TEXT,
  tier TEXT, stage TEXT, stroke_type TEXT, affected_side TEXT, focus TEXT, caregiver TEXT
);

INSERT INTO demo_roster VALUES
('p-chen-huifang','chenhuifang','陈慧芳','女','68 岁','rich','稳定执行期','脑梗死后居家康复','右侧活动受限','手功能机器人、肩手保护与桥式运动','陈先生（儿子）'),
('p-sun-guoqiang','sunguoqiang','孙国强','男','72 岁','rich','稳定执行期','脑梗死后居家康复','左侧活动受限','步行、转移与跌倒预防','孙女士（女儿）'),
('p-zhou-meizhen','zhoumeizhen','周美珍','女','66 岁','rich','稳定执行期','脑卒中后居家康复','右侧上肢活动受限','手指训练、日常生活动作与情绪配合','周先生（丈夫）'),
('p-wu-jianmin','wujianmin','吴建民','男','75 岁','rich','稳定执行期','脑梗死后居家康复','左侧活动受限','认知训练、记忆提示与家庭沟通','吴女士（女儿）'),
('p-zheng-xiuying','zhengxiuying','郑秀英','女','70 岁','rich','稳定执行期','脑卒中后居家康复','一侧肢体活动受限','吞咽观察、皮肤检查与健康监测','郑先生（儿子）'),
('p-li-guilan','liguilan','李桂兰','女','73 岁','starter','准备期（第 1 周）','脑卒中后居家康复','待持续观察','熟悉流程、首次训练与安全保护','李女士（女儿）'),
('p-wang-deshan','wangdeshan','王德山','男','69 岁','starter','准备期（第 1 周）','脑卒中后居家康复','待持续观察','疲劳观察、训练节奏与家属陪护','王先生（儿子）'),
('p-he-shufen','heshufen','何淑芬','女','76 岁','starter','准备期（第 1 周）','脑卒中后居家康复','待持续观察','首次打卡、困难反馈与如实记录','何女士（女儿）'),
('p-gao-zhiyuan','gaozhiyuan','高志远','男','64 岁','starter','准备期（第 1 周）','脑卒中后居家康复','待持续观察','训练前准备、动作安全与异常暂停','高女士（妻子）'),
('p-jiang-yumei','jiangyumei','蒋玉梅','女','71 岁','starter','准备期（第 1 周）','脑卒中后居家康复','待持续观察','时间安排、训练休息与联系康复师','蒋先生（儿子）'),
('p-liu-fusheng','liufusheng','刘福生','男','78 岁','unassessed','','','','已建档，等待首次评估','刘女士（女儿）'),
('p-zhang-suqin','zhangsuqin','张素琴','女','67 岁','unassessed','','','','已建档，资料待补充','张先生（丈夫）'),
('p-huang-jicheng','huangjicheng','黄继成','男','74 岁','unassessed','','','','已分配康复师，尚未评估','黄女士（女儿）'),
('p-luo-chunmei','luochunmei','罗春梅','女','70 岁','unassessed','','','','家属已登记，计划待制定','罗先生（儿子）'),
('p-xu-wenhai','xuwenhai','许文海','男','65 岁','unassessed','','','','初次联系完成，等待评估','许女士（妻子）');

-- 空库会在迁移结束后由 runSeed 灌种；非空旧库必须具备稳定的基础账号，否则整笔迁移失败。
CREATE TEMP TABLE demo_roster_guard (valid INTEGER NOT NULL CHECK (valid=1));
INSERT INTO demo_roster_guard
SELECT CASE WHEN (SELECT count(*) FROM users)=0 OR (
  EXISTS (SELECT 1 FROM users WHERE id='u-family-chen' AND role='family') AND
  EXISTS (SELECT 1 FROM users WHERE id='u-th-zhou' AND role='therapist')
) THEN 1 ELSE 0 END;

INSERT OR IGNORE INTO users
  (id,username,password_hash,password_salt,role,display_name,title,status,created_at,updated_at)
SELECT 'u-family-' || substr(r.id,3),r.username,z.password_hash,z.password_salt,'family',r.caregiver,NULL,
       'active','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'
FROM demo_roster r JOIN users z ON z.id='u-family-chen';

INSERT OR IGNORE INTO patients
  (id,name,gender,age_band,living_situation,psychosocial,communication,avatar,
   primary_therapist_id,origin,status,created_at,updated_at)
SELECT id,name,gender,age_band,
       CASE WHEN tier='unassessed' THEN '基础居住与照护信息待补充' ELSE '与家属共同居住' END,
       CASE WHEN tier='unassessed' THEN '' ELSE '情绪与配合情况持续观察' END,
       focus,'','u-th-zhou','synthetic','active','2026-09-14T00:00:00.000Z','2026-09-14T00:00:00.000Z'
FROM demo_roster WHERE EXISTS (SELECT 1 FROM users WHERE id='u-th-zhou');

INSERT OR IGNORE INTO patient_members (patient_id,user_id,relation,access,granted_at)
SELECT r.id,'u-family-' || substr(r.id,3),'家属','owner','2026-09-14T00:00:00.000Z'
FROM demo_roster r JOIN patients p ON p.id=r.id JOIN users u ON u.id='u-family-' || substr(r.id,3);
INSERT OR IGNORE INTO patient_members (patient_id,user_id,relation,access,granted_at)
SELECT r.id,'u-th-zhou','主管康复师','primary','2026-09-14T00:00:00.000Z'
FROM demo_roster r JOIN patients p ON p.id=r.id JOIN users u ON u.id='u-th-zhou';

INSERT OR IGNORE INTO patient_diagnosis (patient_id,stroke_type,stage,comorbidities)
SELECT r.id,r.stroke_type,r.stage,'[]' FROM demo_roster r JOIN patients p ON p.id=r.id;
INSERT OR IGNORE INTO patient_function
  (patient_id,affected_side,mobility,swallowing,cognition,risks,care_alerts)
SELECT r.id,r.affected_side,CASE WHEN r.tier='unassessed' THEN '' ELSE r.focus END,
       CASE WHEN r.tier='unassessed' THEN '' ELSE '待持续观察' END,
       CASE WHEN r.tier='unassessed' THEN '' ELSE '待持续观察' END,'[]','[]'
FROM demo_roster r JOIN patients p ON p.id=r.id;
INSERT OR IGNORE INTO patient_goals
  (patient_id,short_term,long_term,next_review_date,plan_status,plan_date,plan_items,plan_source_note)
SELECT r.id,
       CASE WHEN r.tier='unassessed' THEN '[]' ELSE json_array(r.focus) END,
       CASE WHEN r.tier='rich' THEN json_array('保持稳定执行并持续复评') ELSE '[]' END,
       CASE WHEN r.tier='unassessed' THEN NULL ELSE '2026-10-14' END,
       CASE WHEN r.tier='unassessed' THEN 'none' ELSE 'approved' END,
       CASE WHEN r.tier='unassessed' THEN NULL ELSE '2026-09-14' END,
       CASE WHEN r.tier='rich' THEN json_array('晨间健康记录',substr(r.focus,1,instr(r.focus,'、')-1),'晚间观察与记录')
            WHEN r.tier='starter' THEN json_array('首次训练安全准备','起步期基础训练') ELSE '[]' END,
       CASE WHEN r.tier='rich' THEN '稳定执行期演示计划。'
            WHEN r.tier='starter' THEN '第一周起步期演示计划。' ELSE '尚未完成首次评估，不生成训练计划。' END
FROM demo_roster r JOIN patients p ON p.id=r.id;
INSERT OR IGNORE INTO patient_contact
  (patient_id,caregiver_name,caregiver_relation,assistive_devices,past_history)
SELECT r.id,r.caregiver,'家属','[]','[]' FROM demo_roster r JOIN patients p ON p.id=r.id;

INSERT OR IGNORE INTO task_defs
  (id,patient_id,kind,title,scheduled_time,instruction,cautions,reps,duration_min,
   requires_video_upload,origin,confirmed_on,active_from,active_to)
SELECT substr(r.id,3)||'-task-monitor',r.id,'record','晨间健康记录','08:00',
       '记录当天精神、睡眠和身体感受。',json_array('异常情况先暂停训练并联系康复师'),NULL,NULL,0,
       'therapist_confirmed','2026-09-14','2026-09-14',NULL FROM demo_roster r JOIN patients p ON p.id=r.id WHERE r.tier='rich'
UNION ALL
SELECT substr(r.id,3)||'-task-training',r.id,'training',substr(r.focus,1,instr(r.focus,'、')-1),'15:00',
       '按照康复师确认的个体化计划执行。',json_array('保证动作稳定，不自行增加强度'),NULL,20,0,
       'therapist_confirmed','2026-09-14','2026-09-14',NULL FROM demo_roster r JOIN patients p ON p.id=r.id WHERE r.tier='rich'
UNION ALL
SELECT substr(r.id,3)||'-task-evening',r.id,'record','晚间观察与记录','20:30',
       '记录训练完成情况、疲劳反应和需要反馈的问题。','[]',NULL,NULL,0,
       'therapist_confirmed','2026-09-14','2026-09-14',NULL FROM demo_roster r JOIN patients p ON p.id=r.id WHERE r.tier='rich'
UNION ALL
SELECT substr(r.id,3)||'-task-prepare',r.id,'record','首次训练安全准备','09:00',
       '清理训练区域，由家属陪同熟悉今日流程。',json_array('不追求一次完成全部内容'),NULL,NULL,0,
       'therapist_confirmed','2026-09-14','2026-09-14',NULL FROM demo_roster r JOIN patients p ON p.id=r.id WHERE r.tier='starter'
UNION ALL
SELECT substr(r.id,3)||'-task-start',r.id,'training','起步期基础训练','15:00',
       '按照康复师下发的起步计划执行并如实记录。',json_array('出现明显不适立即停止'),NULL,10,0,
       'therapist_confirmed','2026-09-14','2026-09-14',NULL FROM demo_roster r JOIN patients p ON p.id=r.id WHERE r.tier='starter';

WITH RECURSIVE days(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM days WHERE n<14)
INSERT OR IGNORE INTO check_ins (id,patient_id,task_id,date,status,note,at)
SELECT 'ci-'||r.id||'-'||d.n||'-'||t.id,r.id,t.id,printf('2026-09-%02d',d.n),
       CASE WHEN d.n%6=0 THEN 'missed' ELSE 'done' END,
       CASE WHEN d.n%6=0 THEN '当日未完成，已如实记录' ELSE NULL END,
       CASE WHEN d.n%6=0 THEN NULL ELSE printf('2026-09-%02dT%s:00+08:00',d.n,t.scheduled_time) END
FROM demo_roster r JOIN task_defs t ON t.patient_id=r.id CROSS JOIN days d WHERE r.tier='rich';

WITH RECURSIVE days(n) AS (VALUES(7) UNION ALL SELECT n+1 FROM days WHERE n<14)
INSERT OR IGNORE INTO vitals (id,patient_id,date,time,systolic,diastolic,by,at)
SELECT 'v-'||r.id||'-'||d.n,r.id,printf('2026-09-%02d',d.n),'08:00',120+d.n%5,76+d.n%4,
       r.caregiver,printf('2026-09-%02dT08:00:00+08:00',d.n)
FROM demo_roster r JOIN patients p ON p.id=r.id CROSS JOIN days d WHERE r.tier='rich';

WITH notes(seq,day,text) AS (
  VALUES (1,3,'继续按当前计划执行，优先保证动作安全与记录完整。'),
         (2,8,'如出现新发不适或完成度明显下降，先暂停并在咨询中说明具体表现。'),
         (3,13,'下次复评前保持当前节奏，不自行增加训练强度。')
)
INSERT OR IGNORE INTO guidances
  (id,patient_id,therapist_user_id,therapist_name,text,about_task_id,about_date,read_by_family,read_at,at)
SELECT 'g-'||r.id||'-'||n.seq,r.id,'u-th-zhou','小婷',n.text,substr(r.id,3)||'-task-training',
       printf('2026-09-%02d',n.day),1,printf('2026-09-%02dT10:00:00+08:00',n.day),
       printf('2026-09-%02dT10:00:00+08:00',n.day)
FROM demo_roster r JOIN patients p ON p.id=r.id CROSS JOIN notes n WHERE r.tier='rich';

-- 不允许 INSERT OR IGNORE 把残缺升级伪装成成功。
INSERT INTO demo_roster_guard
SELECT CASE WHEN (SELECT count(*) FROM users)=0 OR (
  (SELECT count(*) FROM users WHERE id IN (SELECT 'u-family-'||substr(id,3) FROM demo_roster))=15 AND
  (SELECT count(*) FROM patients WHERE id IN (SELECT id FROM demo_roster))=15 AND
  (SELECT count(*) FROM patient_members WHERE access='owner' AND patient_id IN (SELECT id FROM demo_roster))=15 AND
  (SELECT count(*) FROM patient_members WHERE access='primary' AND patient_id IN (SELECT id FROM demo_roster))=15
) THEN 1 ELSE 0 END;

DROP TABLE demo_roster_guard;
DROP TABLE demo_roster;
