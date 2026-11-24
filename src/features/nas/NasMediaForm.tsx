import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { NasPicker } from './NasPicker'
import './nas.css'

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'NAS 操作失败，请稍后重试。'
}

/** Selects NAS media and runs the chosen operation on the server. */
export function NasMediaForm({ mode }: { mode: 'convert' | 'rename' }) {
  const [source, setSource] = useState('')
  const [directory, setDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const convert = mode === 'convert'
  useEffect(() => () => request.current?.abort(), [])

  async function submit() {
    if (request.current || !source || (convert && !directory)) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setStatus('')
    setError('')
    try {
      const result = convert
        ? await api.nasConvert(source, directory, controller.signal)
        : await api.nasRename(source, controller.signal)
      if (controller.signal.aborted) return
      setStatus(convert ? `已保存到 NAS：${result.path}` : result.path === source ? `文件名已与歌曲标题一致：${result.path}` : `已重命名：${result.path}`)
      if (!convert && result.path !== source) setSource('')
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause))
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function choose(set: (value: string) => void, value: string) {
    set(value)
    setStatus('')
    setError('')
  }

  return <form className="nas-media-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <NasPicker label={convert ? 'NAS 视频文件' : 'NAS 音频文件'} kind={convert ? 'video' : 'audio'} selected={source} onSelect={(value) => choose(setSource, value)} disabled={busy} />
    {convert && <NasPicker label="NAS 输出文件夹" kind="folder" selected={directory} onSelect={(value) => choose(setDirectory, value)} disabled={busy} />}
    <div className="nas-form-actions">
      <button type="submit" className="nas-button nas-button-primary" disabled={busy || !source || (convert && !directory)}>
        {convert ? '转换并保存到 NAS' : '按歌曲名重命名'}
        {busy ? <LoaderCircle size={16} className="nas-spinner" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </div>
    <div role="status" className="nas-feedback" data-success={!!status}>{busy ? (convert ? '正在 NAS 上转换并保存，请保持此页面打开…' : '正在读取歌曲标题并重命名…') : status && <><CheckCircle2 size={17} aria-hidden="true" /><span>{status}</span></>}</div>
    {error && <p role="alert" className="nas-feedback nas-feedback-error">{error}</p>}
  </form>
}
