/**
 * 中文检索分词 —— 二字滑窗（bigram）。
 *
 * SQLite FTS5 自带的 unicode61 不切中文，整段会当成一个词；trigram 分词器
 * 对中文是三字窗，精度不如 bigram。做法是入库时把正文切成二字串
 * （「脑卒中康复」→「脑卒 卒中 中康 康复」），用 unicode61 按空格建索引，
 * 查询时同样处理。BM25 由 FTS5 提供，**零额外依赖、零模型、断网可用**。
 *
 * 拉丁字母与数字按整词保留，不拆 —— 「MMSE」「120」拆成二字反而降低精度。
 */

const CJK = /[㐀-䶿一-鿿豈-﫿]/
const ALNUM = /[A-Za-z0-9]/

export function tokenize(text: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (CJK.test(ch)) {
      let j = i
      while (j < text.length && CJK.test(text[j])) j++
      const run = text.slice(i, j)
      if (run.length === 1) out.push(run)
      else for (let k = 0; k + 1 < run.length; k++) out.push(run.slice(k, k + 2))
      i = j
    } else if (ALNUM.test(ch)) {
      let j = i
      while (j < text.length && ALNUM.test(text[j])) j++
      out.push(text.slice(i, j).toLowerCase())
      i = j
    } else {
      i++
    }
  }
  return out
}

export const toBigram = (text: string) => tokenize(text).join(' ')

/**
 * 构造 FTS5 MATCH 表达式。
 *
 * 每个词单独加引号：bigram 里可能出现 FTS5 语法字符，不引会解析失败。
 * 用 OR 而非默认的隐式 AND —— 家属问一整句话，要求每个二字窗都命中
 * 等于什么都搜不到；召回交给 OR，排序交给 BM25。
 */
export function toMatchQuery(q: string, limit = 60): string | null {
  const terms = [...new Set(tokenize(q))].slice(0, limit)
  if (terms.length === 0) return null
  return terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ')
}
