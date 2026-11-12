import { useState } from 'react'
import { Link } from 'react-router-dom'
import { localDateToTimestamp, timestampToDate } from '../lib/communityTools'
import './community-tools.css'

/** Converts Unix timestamps and local date-time values without network requests. */
export default function TimestampPage() {
  const [timestamp, setTimestamp] = useState('')
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds')
  const [local, setLocal] = useState('')
  const date = timestamp ? timestampToDate(timestamp, unit) : null
  const converted = local ? localDateToTimestamp(local) : null

  return <div className="community-tool">
    <Link className="community-back" to="/">← 返回应用库</Link>
    <header className="community-header"><span className="section-kicker">EVERYDAY TOOL</span><h1>时间戳转换</h1><p>在 Unix 时间戳与本地日期时间之间转换，也可查看对应的 UTC 时间。</p></header>
    <div className="community-columns">
      <section className="community-panel community-form"><h2>时间戳 → 日期</h2><label htmlFor="timestamp-input">Unix 时间戳</label><input id="timestamp-input" inputMode="numeric" value={timestamp} onChange={(event) => setTimestamp(event.currentTarget.value)} placeholder="例如 1735689600" /><label htmlFor="timestamp-unit">单位</label><select id="timestamp-unit" value={unit} onChange={(event) => setUnit(event.currentTarget.value as 'seconds' | 'milliseconds')}><option value="seconds">秒</option><option value="milliseconds">毫秒</option></select><div className="community-result" aria-live="polite">{date ? <><p>本地时间：<strong>{date.toLocaleString('zh-CN')}</strong></p><p>UTC 时间：<strong>{date.toISOString()}</strong></p></> : <p>{timestamp ? '请输入有效的整数时间戳。' : '输入时间戳后显示日期。'}</p>}</div></section>
      <section className="community-panel community-form"><h2>日期 → 时间戳</h2><label htmlFor="local-date-input">本地日期和时间</label><input id="local-date-input" type="datetime-local" value={local} onChange={(event) => setLocal(event.currentTarget.value)} /><div className="community-result" aria-live="polite">{converted !== null ? <><p>秒：<strong>{Math.floor(converted / 1000)}</strong></p><p>毫秒：<strong>{converted}</strong></p></> : <p>{local ? '请输入有效的本地日期和时间。' : '选择日期和时间后显示时间戳。'}</p>}</div></section>
    </div>
    <p className="community-hint">日期输入采用设备当前时区；夏令时跳过的本地时间无法转换。</p>
  </div>
}
