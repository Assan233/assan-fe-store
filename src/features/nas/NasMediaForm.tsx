import { useEffect, useRef, useState } from 'react'
import { api, type NasEntry, type NasKind } from '../../lib/api'
import './nas.css'

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'NAS 操作失败，请稍后重试。'
}

function Picker({ label, kind, selected, onSelect, disabled, version = 0 }: {
  label: string
  kind: NasKind
  selected: string
  onSelect: (path: string) => void
  disabled: boolean
  version?: number
}) {
  const [directory, setDirectory] = useState('.')
  const [shown, setShown] = useState(false)
  const [retry, setRetry] = useState(0)
  const [listing, setListing] = useState<{ directory: string; version: number; retry: number; entries?: NasEntry[]; error?: string }>()
  useEffect(() => {
    if (!shown) return
    const controller = new AbortController()
    api.nasEntries(directory, kind, controller.signal).then(
      (entries) => { if (!controller.signal.aborted) setListing({ directory, version, retry, entries }) },
      (cause: unknown) => { if (!controller.signal.aborted) setListing({ directory, version, retry, error: errorMessage(cause) }) },
    )
    return () => controller.abort()
  }, [directory, kind, shown, retry, version])

  const current = listing?.directory === directory && listing.version === version && listing.retry === retry ? listing : undefined
  const select = (path: string) => { onSelect(path); setShown(false) }
  return <fieldset className="nas-picker" disabled={disabled}>
    <legend>{label}</legend>
    <div className="audio-actions">
      <button type="button" aria-expanded={shown} onClick={() => {
        if (!shown) setRetry((value) => value + 1)
        setShown(!shown)
      }}>{shown ? '收起目录' : selected ? '重新选择' : '浏览 NAS'}</button>
      <span className="nas-path">{selected === '.' ? 'NAS 根目录' : selected || '未选择'}</span>
    </div>
    {shown && <div className="nas-directory">
      <p className="nas-path">当前目录：{directory === '.' ? 'NAS 根目录' : directory}</p>
      {kind === 'folder' && directory === '.' && <p>配置了多个 NAS 路径时，请进入其中一个可写目录作为输出位置。</p>}
      <div className="audio-actions">
        <button type="button" disabled={directory === '.'} onClick={() => setDirectory(directory.split('/').slice(0, -1).join('/') || '.')}>返回上一级</button>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>刷新</button>
        {kind === 'folder' && <button type="button" disabled={!current?.entries} onClick={() => select(directory)}>使用当前目录</button>}
      </div>
      {!current && <p role="status">正在读取 NAS…</p>}
      {current?.error && <p role="alert" className="audio-error">{current.error}</p>}
      {current?.entries?.length === 0 && <p>该目录没有可选的{kind === 'folder' ? '子文件夹' : '文件或子文件夹'}。</p>}
      {!!current?.entries?.length && <ul className="nas-entries" aria-label={`${label}条目`}>
        {current.entries.map((entry) => <li key={entry.name}>
          <button type="button" onClick={() => {
            const path = directory === '.' ? entry.name : `${directory}/${entry.name}`
            if (entry.directory) setDirectory(path)
            else select(path)
          }}><span aria-hidden="true">{entry.directory ? '▸ ' : '♪ '}</span>{entry.name}</button>
        </li>)}
      </ul>}
    </div>}
  </fieldset>
}

/** Selects NAS media and runs the chosen operation on the server. */
export function NasMediaForm({ mode }: { mode: 'convert' | 'rename' }) {
  const [source, setSource] = useState('')
  const [directory, setDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)
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
      if (!convert && result.path !== source) {
        setSource('')
        setVersion((value) => value + 1)
      }
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
    <Picker label={convert ? 'NAS 视频文件' : 'NAS 音频文件'} kind={convert ? 'video' : 'audio'} selected={source} onSelect={(value) => choose(setSource, value)} disabled={busy} version={version} />
    {convert && <Picker label="NAS 输出文件夹" kind="folder" selected={directory} onSelect={(value) => choose(setDirectory, value)} disabled={busy} />}
    <div className="audio-actions">
      <button type="submit" className="audio-primary" disabled={busy || !source || (convert && !directory)}>
        {convert ? '转换并保存到 NAS' : '按歌曲名重命名'}
      </button>
    </div>
    <p role="status" className="audio-status nas-path">{busy ? (convert ? '正在 NAS 上转换并保存，请保持此页面打开…' : '正在读取歌曲标题并重命名…') : status}</p>
    {error && <p role="alert" className="audio-error">{error}</p>}
  </form>
}
