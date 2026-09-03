import { Link, useParams } from 'react-router-dom'
import { FORUM_DISCLAIMER, FORUM_POSTS } from '../../data/resources'
import { IconAlert, IconCheck, IconHeart } from '../../components/Icons'

/** 论坛帖子详情 —— 示例帖正文 + 回复。静态演示，无发帖互动。 */
export function ForumPostView() {
  const { id } = useParams()
  const p = FORUM_POSTS.find((x) => x.id === id)
  if (!p) {
    return (
      <div className="stack">
        <div className="crumb">
          <Link to="/patient/forum">家属互助论坛</Link>
          <span>/</span>
        </div>
        <section className="card card-pad"><span className="card-note">没有找到这条帖子</span></section>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="crumb">
        <Link to="/patient">今日</Link>
        <span>/</span>
        <Link to="/patient/forum">家属互助论坛</Link>
        <span>/</span>
        <span>帖子详情</span>
      </div>

      <section className="card card-pad">
        <div className="grow-m" style={{ marginBottom: 10 }}>
          <span className="chip">{p.kind}</span>
          {p.essence && <span className="chip chip-ok"><IconCheck size={10} /> 精华</span>}
        </div>
        <h1 className="card-title" style={{ fontSize: 'var(--t-xl)' }}>{p.title}</h1>
        <p className="card-note" style={{ marginTop: 6 }}>
          {p.author} · {p.role === '康复师' ? '康复师' : '家属'} · {p.time}
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {p.body.map((t, i) => (
            <p style={{ margin: 0, lineHeight: 1.8 }} key={i}>{t}</p>
          ))}
        </div>
        <div className="card-note" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconHeart size={13} /> {p.likes} 位家属觉得有帮助
        </div>
      </section>

      <div className="eyebrow" style={{ marginBottom: -6 }}>回复（{p.replies.length}）</div>
      {p.replies.map((r, i) => (
        <section className="card card-pad" key={i} style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="who-dot">{r.author[0]}</span>
            <b style={{ fontSize: 'var(--t-sm)' }}>{r.author}</b>
            <span className="chip" style={r.role === '康复师' ? { background: 'var(--green-100)', color: 'var(--green-700)' } : undefined}>
              {r.role === '康复师' ? '康复师' : '家属'}
            </span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.8 }}>{r.text}</p>
        </section>
      ))}

      <div className="alert">
        <span style={{ flex: 'none', marginTop: 2 }}><IconAlert size={15} /></span>
        <span>{FORUM_DISCLAIMER}</span>
      </div>
    </div>
  )
}
