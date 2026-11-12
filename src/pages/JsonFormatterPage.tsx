import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatJson } from '../lib/communityTools'
import './community-tools.css'

/** Formats JSON locally, with validation feedback and a copyable result. */
export default function JsonFormatterPage() {
  const [input, setInput] = useState('')
  const [spaces, setSpaces] = useState(2)
  const [mode, setMode] = useState<'pretty' | 'compact'>('pretty')
  const [copied, setCopied] = useState(false)
  let output = ''
  let error = ''
  if (input.trim()) {
    try { output = formatJson(input, mode === 'compact' ? 0 : spaces) }
    catch (caught) { error = caught instanceof Error ? caught.message : '输入的内容不是有效的 JSON。' }
  }

  return <div className="community-tool">
    <Link className="community-back" to="/">← 返回应用库</Link>
    <header className="community-header"><span className="section-kicker">DEVELOPER TOOL</span><h1>JSON 格式化</h1><p>粘贴 JSON，实时校验并整理结构。内容只在当前浏览器中处理。</p></header>
    <div className="community-actions" role="group" aria-label="输出选项">
      <button type="button" aria-pressed={mode === 'pretty'} onClick={() => setMode('pretty')}>格式化</button>
      <button type="button" aria-pressed={mode === 'compact'} onClick={() => setMode('compact')}>压缩</button>
      <label htmlFor="json-indent">缩进</label><select id="json-indent" value={spaces} disabled={mode === 'compact'} onChange={(event) => setSpaces(Number(event.currentTarget.value))}><option value={2}>2 空格</option><option value={4}>4 空格</option></select>
      <button type="button" disabled={!output} onClick={async () => { try { await navigator.clipboard.writeText(output); setCopied(true) } catch { setCopied(false) } }}>{copied ? '已复制' : '复制结果'}</button>
    </div>
    <div className="community-columns">
      <section className="community-panel"><label htmlFor="json-input">输入 JSON</label><textarea id="json-input" spellCheck={false} value={input} onChange={(event) => { setInput(event.currentTarget.value); setCopied(false) }} placeholder={'例如：{"hello":"世界"}'} /></section>
      <section className="community-panel"><label htmlFor="json-output">处理结果</label><textarea id="json-output" readOnly spellCheck={false} value={output} placeholder="格式化后的内容会显示在这里" /></section>
    </div>
    {error && <p className="community-error" role="alert">JSON 无效：{error}</p>}
  </div>
}
