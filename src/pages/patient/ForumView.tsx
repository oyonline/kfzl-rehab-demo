import { Link } from 'react-router-dom'
import { FORUM_POSTS } from '../../data/resources'
import { IconCheck, IconChat, IconChevron } from '../../components/Icons'

/**
 * 家属互助论坛（演示版）—— 需求书 3.9：
 * 入口可见，进来是预设示例帖（经验分享 / 提问求助 / 康复师话题 / 心理互助），
 * 静态展示论坛氛围，不做真实发帖互动（2026-08-31 用户裁决：帖子由本项目起草）。
 * 免责声明为需求书 3.9「内容管理与安全」的原文要求。
 */
export function ForumView() {
  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient">今日</Link>
        <span>/</span>
        <span>家属互助论坛</span>
      </div>

      <section className="card card-pad">
        <div className="eyebrow">家属互助论坛</div>
        <h2 className="card-title">家属互助 + 专业支持</h2>
        <p className="card-note" style={{ marginTop: 6 }}>
          分享照护经验、交流康复心得、互相鼓励。康复师团队在群内定期答疑、发布每周话题
        </p>
      </section>

      <div className="glist">
        {FORUM_POSTS.map((p) => (
          <Link className="grow" to={`/patient/forum/${p.id}`} key={p.id}>
            <span className="grow-ico"><IconChat size={19} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="grow-t">{p.title}</span>
              <span className="grow-s">
                {p.author} · {p.time} · {p.replies.length} 条回复
              </span>
              <span className="grow-m">
                <span className="chip">{p.kind}</span>
                {p.essence && <span className="chip chip-ok"><IconCheck size={10} /> 精华</span>}
              </span>
            </span>
            <span className="grow-go"><IconChevron /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}
