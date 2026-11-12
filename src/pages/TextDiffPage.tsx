import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { compareLines } from '../lib/communityTools'
import './community-tools.css'

/** Compares two texts line by line and displays an aligned, accessible diff. */
export default function TextDiffPage() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const rows = useMemo(() => compareLines(left, right), [left, right])
  const changed = rows?.filter((row) => row.kind !== 'same').length ?? 0

  return <div className="community-tool">
    <Link className="community-back" to="/">← 返回应用库</Link>
    <header className="community-header"><span className="section-kicker">TEXT TOOL</span><h1>文本比较</h1><p>并排粘贴两段文字，按行查看新增、删除和修改的内容。</p></header>
    <div className="community-columns">
      <section className="community-panel"><label htmlFor="diff-left">原始文本</label><textarea id="diff-left" value={left} onChange={(event) => setLeft(event.currentTarget.value)} placeholder="粘贴原始文本" spellCheck={false} /></section>
      <section className="community-panel"><label htmlFor="diff-right">新文本</label><textarea id="diff-right" value={right} onChange={(event) => setRight(event.currentTarget.value)} placeholder="粘贴修改后的文本" spellCheck={false} /></section>
    </div>
    <section className="community-diff" aria-labelledby="diff-title"><h2 id="diff-title">比较结果</h2>
      {rows === null ? <p className="community-error" role="alert">每侧最多比较 300 行，请缩短文本后重试。</p> : rows.length === 0 ? <p className="community-hint">输入两段文字后显示差异。</p> : <><p className="community-hint" aria-live="polite">{changed ? `${changed} 处差异` : '两段文本相同'}</p><div className="community-diff-scroll"><table><thead><tr><th scope="col">原始文本</th><th scope="col">新文本</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className={`diff-${row.kind}`}><td>{row.left ?? <span className="sr-only">无对应行</span>}</td><td>{row.right ?? <span className="sr-only">无对应行</span>}</td></tr>)}</tbody></table></div></>}
    </section>
  </div>
}
