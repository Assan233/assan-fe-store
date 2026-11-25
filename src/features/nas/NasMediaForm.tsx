import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { NasPicker } from './NasPicker'
import { NasConversionHistory } from './NasConversionHistory'
import { collectNasVideos, type NasBatchFailure, type NasSelection } from './videoBatch'
import './nas.css'

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'NAS 操作失败，请稍后重试。'
}

/** Selects NAS media and runs the chosen operation on the server. */
export function NasMediaForm({ mode }: { mode: 'convert' | 'rename' }) {
  const [source, setSource] = useState('')
  const [videos, setVideos] = useState<NasSelection[]>([])
  const [directory, setDirectory] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [failures, setFailures] = useState<NasBatchFailure[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)
  const request = useRef<AbortController | null>(null)
  const convert = mode === 'convert'
  useEffect(() => () => request.current?.abort(), [])

  async function submit() {
    if (request.current || (convert ? !videos.length || !directory : !source)) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setStatus('')
    setError('')
    setFailures([])
    setProgress(convert ? '正在查找所选来源中的视频…' : '正在读取歌曲标题并重命名…')
    try {
      if (convert) {
        const { files, failures: scanFailures } = await collectNasVideos(videos, controller.signal)
        const batchFailures = [...scanFailures]
        let submitted = 0
        for (const [index, file] of files.entries()) {
          controller.signal.throwIfAborted()
          setProgress(`正在提交 ${index + 1}/${files.length}：${file}`)
          try {
            await api.nasConvert(file, directory, controller.signal)
            submitted++
          } catch (cause) {
            controller.signal.throwIfAborted()
            batchFailures.push({ path: file, message: errorMessage(cause) })
          }
        }
        controller.signal.throwIfAborted()
        setFailures(batchFailures)
        if (!files.length) setError(scanFailures.length ? '在可读取的来源中没有找到可转换的视频。' : '所选来源中没有找到 MP4 或 MKV 视频。')
        else if (!submitted) setError('没有成功提交转换任务。')
        else {
          setStatus(`已提交 ${submitted}/${files.length} 个转换任务。NAS 将在后台处理，现在可以关闭页面。`)
          setHistoryVersion((version) => version + 1)
        }
      } else {
        const result = await api.nasRename(source, controller.signal)
        if (controller.signal.aborted) return
        setStatus(result.path === source ? `文件名已与歌曲标题一致：${result.path}` : `已重命名：${result.path}`)
        if (result.path !== source) setSource('')
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
  }

  return <><form className="nas-media-form" onSubmit={(event) => { event.preventDefault(); void submit() }}>
    {convert ? <NasPicker label="NAS 视频文件或文件夹" kind="video" multiple selected={videos} onSelect={(value) => choose(setVideos, value)} disabled={busy} />
      : <NasPicker label="NAS 音频文件" kind="audio" selected={source} onSelect={(value) => choose(setSource, value)} disabled={busy} />}
    {convert && <NasPicker label="NAS 输出文件夹" kind="folder" selected={directory} onSelect={(value) => choose(setDirectory, value)} disabled={busy} />}
    <div className="nas-form-actions">
      <button type="submit" className="nas-button nas-button-primary" disabled={busy || (convert ? !videos.length || !directory : !source)}>
        {convert ? '提交转换任务' : '按歌曲名重命名'}
        {busy ? <LoaderCircle size={16} className="nas-spinner" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </div>
    <div role="status" className="nas-feedback" data-success={!!status}>{busy ? <span>{progress}</span> : status && <><CheckCircle2 size={17} aria-hidden="true" /><span>{status}</span></>}</div>
    {error && <p role="alert" className="nas-feedback nas-feedback-error">{error}</p>}
    {failures.length > 0 && <section className="nas-feedback nas-feedback-error nas-batch-failures" aria-label="批量转换问题">
      <p role="alert">有 {failures.length} 项未能读取或提交：</p>
      <ul>{failures.map(({ path, message }) => <li key={path}><strong>{path === '.' ? 'NAS 根目录' : path}</strong>：{message}</li>)}</ul>
    </section>}
  </form>{convert && <NasConversionHistory version={historyVersion} />}</>
}
