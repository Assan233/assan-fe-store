import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { NasPicker } from './NasPicker'
import { NasConversionHistory } from './NasConversionHistory'
import { collectNasFiles, type NasBatchFailure, type NasSelection } from './mediaBatch'
import './nas.css'

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'NAS 操作失败，请稍后重试。'
}

/** Selects NAS media and runs the chosen operation on the server. */
export function NasMediaForm({ mode }: { mode: 'convert' | 'rename' }) {
  const [sources, setSources] = useState<NasSelection[]>([])
  const [directory, setDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [failures, setFailures] = useState<NasBatchFailure[]>([])
  const [renamed, setRenamed] = useState<{ source: string; path: string }[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)
  const request = useRef<AbortController | null>(null)
  const convert = mode === 'convert'
  useEffect(() => () => request.current?.abort(), [])

  async function submit() {
    if (request.current || !sources.length || (convert && !directory)) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setStatus('')
    setError('')
    setFailures([])
    setRenamed([])
    setProgress(`正在查找所选来源中的${convert ? '视频' : '音频'}…`)
    try {
      const { files, failures: scanFailures } = await collectNasFiles(sources, convert ? 'video' : 'audio', controller.signal)
      const batchFailures = [...scanFailures]
      const changes: typeof renamed = []
      let succeeded = 0
      let unchanged = 0
      for (const [index, file] of files.entries()) {
        controller.signal.throwIfAborted()
        setProgress(`${convert ? '正在提交' : '正在重命名'} ${index + 1}/${files.length}：${file}`)
        try {
          if (convert) {
            await api.nasConvert(file, directory, controller.signal)
          } else {
            const { path } = await api.nasRename(file, controller.signal)
            if (path === file) unchanged++
            else changes.push({ source: file, path })
          }
          succeeded++
        } catch (cause) {
          controller.signal.throwIfAborted()
          batchFailures.push({ path: file, message: errorMessage(cause) })
        }
      }
      controller.signal.throwIfAborted()
      setFailures(batchFailures)
      if (!files.length) {
        const media = convert ? 'MP4 或 MKV 视频' : '支持的音频文件'
        setError(`${scanFailures.length ? '在可读取的来源中' : '所选来源中'}没有找到${media}。`)
      } else if (convert) {
        if (!succeeded) setError('没有成功提交转换任务。')
        else {
          setStatus(`已提交 ${succeeded}/${files.length} 个转换任务。NAS 将在后台处理，现在可以关闭页面。`)
          setHistoryVersion((version) => version + 1)
        }
      } else if (!succeeded) {
        setError('没有成功重命名的文件。')
      } else {
        setStatus(`已重命名 ${changes.length} 个文件，${unchanged} 个文件名已与歌曲标题一致。`)
        setRenamed(changes)
        const oldPaths = new Set(changes.map(({ source }) => source))
        setSources((current) => current.filter((entry) => entry.directory || !oldPaths.has(entry.path)))
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause))
    } finally {
      if (request.current === controller) request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function choose<T>(set: (value: T) => void, value: T) {
    set(value)
    setStatus('')
    setError('')
    setFailures([])
    setRenamed([])
  }

  return <><form className="nas-media-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <NasPicker label={`NAS ${convert ? '视频' : '音频'}文件或文件夹`} kind={convert ? 'video' : 'audio'} multiple selected={sources} onSelect={(value) => choose(setSources, value)} disabled={busy} />
    {convert && <NasPicker label="NAS 输出文件夹" kind="folder" selected={directory} onSelect={(value) => choose(setDirectory, value)} disabled={busy} />}
    <div className="nas-form-actions">
      <button type="submit" className="nas-button nas-button-primary" disabled={busy || !sources.length || (convert && !directory)}>
        {convert ? '提交转换任务' : '按歌曲名重命名'}
        {busy ? <LoaderCircle size={16} className="nas-spinner" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </div>
    <div role="status" className="nas-feedback" data-success={!!status}>{busy ? <span>{progress}</span> : status && <><CheckCircle2 size={17} aria-hidden="true" /><span>{status}</span></>}</div>
    {error && <p role="alert" className="nas-feedback nas-feedback-error">{error}</p>}
    {renamed.length > 0 && <details className="nas-feedback nas-batch-results">
      <summary>查看重命名结果</summary>
      <ul>{renamed.map(({ source, path }) => <li key={source}>{source} → <strong>{path}</strong></li>)}</ul>
    </details>}
    {failures.length > 0 && <section className="nas-feedback nas-feedback-error nas-batch-results" aria-label={convert ? '批量转换问题' : '批量重命名问题'}>
      <p role="alert">有 {failures.length} 项未能读取或{convert ? '提交' : '重命名'}：</p>
      <ul>{failures.map(({ path, message }) => <li key={path}><strong>{path === '.' ? 'NAS 根目录' : path}</strong>：{message}</li>)}</ul>
    </section>}
  </form>{convert && <NasConversionHistory version={historyVersion} />}</>
}
