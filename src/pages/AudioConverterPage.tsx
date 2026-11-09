import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileAudio, FolderOpen, ShieldCheck } from 'lucide-react'
import { convertToFlac, validateAudio } from '../features/audio/convert'
import { archiveAudio } from '../features/audio/archive'
import './audio-converter.css'

type AudioItem = {
  file: File
  invalid?: string
  error?: string
  status: string
  selected?: boolean
  result?: { url: string; name: string; size: number; blob: Blob }
}

/** Local-only M4A conversion workflow, including cancellation and download cleanup. */
export default function AudioConverterPage() {
  const [items, setItems] = useState<AudioItem[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('选择音频后开始转换。')
  const controller = useRef<AbortController | null>(null)
  const resultURLs = useRef<string[]>([])
  const [packing, setPacking] = useState(false)
  const [archive, setArchive] = useState('')
  const [archiveError, setArchiveError] = useState('')
  const archiveURL = useRef('')
  const revision = useRef(0)
  const completed = items.filter((item) => item.result)
  const selected = completed.filter((item) => item.selected)

  useEffect(() => () => {
    controller.current?.abort()
    resultURLs.current.forEach((url) => URL.revokeObjectURL(url))
    revision.current++
    if (archiveURL.current) URL.revokeObjectURL(archiveURL.current)
  }, [])

  function clearResult() {
    resultURLs.current.forEach((url) => URL.revokeObjectURL(url))
    resultURLs.current = []
  }

  function clearArchive() {
    revision.current++
    if (archiveURL.current) URL.revokeObjectURL(archiveURL.current)
    archiveURL.current = ''
    setArchive('')
    setArchiveError('')
    setPacking(false)
  }

  async function pack() {
    clearArchive()
    const version = revision.current
    setPacking(true)
    try {
      const files = selected.flatMap((item) => item.result ? [item.result] : [])
      const blob = await archiveAudio(files)
      if (version !== revision.current) return
      archiveURL.current = URL.createObjectURL(blob)
      setArchive(archiveURL.current)
    } catch {
      if (version === revision.current) setArchiveError('打包失败，请减少选择的文件后重试，或逐个下载。')
    } finally {
      if (version === revision.current) setPacking(false)
    }
  }

  async function convert() {
    const pending = items.map((item, index) => ({ ...item, index })).filter((item) => !item.invalid && !item.result)
    if (!pending.length || controller.current) return
    clearArchive()
    const job = new AbortController()
    controller.current = job
    setBusy(true)
    function update(index: number, patch: Partial<AudioItem>) {
      if (!job.signal.aborted) setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item))
    }
    try {
      for (const [position, item] of pending.entries()) {
        if (job.signal.aborted) return
        setMessage(`正在处理 ${position + 1}/${pending.length}：${item.file.name}`)
        update(item.index, { error: undefined, status: '正在加载转换引擎…' })
        try {
          const blob = await convertToFlac(item.file, job.signal, (text) => update(item.index, { status: text }))
          if (job.signal.aborted) return
          const url = URL.createObjectURL(blob)
          resultURLs.current.push(url)
          update(item.index, { result: { url, name: item.file.name.replace(/\.m4a$/i, '.flac'), size: blob.size, blob }, selected: true, status: '转换完成' })
        } catch (cause) {
          if (job.signal.aborted) return
          update(item.index, { error: cause instanceof Error ? cause.message : '转换失败，请重试或选择更小的文件。', status: '转换失败' })
        }
      }
      setMessage('本批次处理完成。可下载成功的文件，或再次开始转换以重试失败文件。')
    } finally {
      if (controller.current === job) {
        controller.current = null
        if (!job.signal.aborted) setBusy(false)
      }
    }
  }

  return (
    <section className="audio-converter" aria-labelledby="audio-title">
      <Link to="/" className="hero-link">← 返回应用库</Link>
      <div className="section-kicker">LOCAL AUDIO TOOL</div>
      <h1 id="audio-title">M4A 转 FLAC</h1>
      <p>在浏览器中转换音频，文件不会上传到服务器。</p>
      <ol className="audio-steps" aria-label="转换步骤"><li><span>1</span>选择 M4A 文件</li><li><span>2</span>开始本地转换</li><li><span>3</span>下载 FLAC</li></ol>
      <div className="audio-panel">
        <div className={`audio-picker${busy ? ' is-disabled' : ''}`}>
        <div className="audio-picker-icon"><FolderOpen size={32} aria-hidden="true" /></div>
        <h2>{items.length ? `已选择 ${items.length} 个音频文件` : '从选择你的音频开始'}</h2>
        <p>支持一次选择多个 M4A 文件，单个文件最多 100 MiB</p>
        <label htmlFor="audio-file" className="sr-only">选择 M4A 音频</label>
        <input id="audio-file" type="file" multiple accept=".m4a,audio/mp4,audio/x-m4a" disabled={busy} aria-describedby="audio-help" onChange={(event) => {
          const selected = Array.from(event.currentTarget.files ?? [])
          if (!selected.length) return
          clearResult()
          clearArchive()
          setItems(selected.map((file) => {
            const invalid = validateAudio(file)
            return { file, invalid, status: invalid ? '无法转换' : '等待转换' }
          }))
          setMessage(`已选择 ${selected.length} 个文件，将逐个转换。`)
        }} />
        <p className="audio-privacy"><ShieldCheck size={16} aria-hidden="true" />仅在你的设备上处理，音频不上传</p>
        </div>
        <p id="audio-help" className="audio-help">{items.length ? '重新选择会替换当前列表，请先下载已完成的文件。' : '点击上方「选择文件」打开文件夹，可按住 Ctrl / ⌘ 多选。'}首次转换需加载约 32 MB 引擎。</p>
        <div className="audio-actions audio-convert-actions">
          <button className="audio-primary" type="button" disabled={!items.some((item) => !item.invalid && !item.result) || busy} onClick={() => void convert()}>{busy ? '正在转换…' : '开始转换'}</button>
          {busy && <button type="button" onClick={() => {
            controller.current?.abort()
            controller.current = null
            setBusy(false)
            setItems((current) => current.map((item) => item.result || item.invalid ? item : { ...item, status: '已暂停' }))
            setMessage('已取消，已完成的文件仍可下载。再次开始将处理未完成的文件。')
          }}>取消转换</button>}
        </div>
        <p role="status" className="audio-status">{message}</p>
        {completed.length > 0 && <div className="audio-actions audio-batch-actions">
          <label><input type="checkbox" checked={selected.length === completed.length} disabled={busy || packing} onChange={(event) => {
            clearArchive()
            const checked = event.target.checked
            setItems((current) => current.map((item) => item.result ? { ...item, selected: checked } : item))
          }} />全选已完成文件</label>
          <button className="audio-secondary" type="button" disabled={busy || packing || !selected.length} onClick={() => void pack()}>{packing ? '正在打包…' : `打包选中 ${selected.length} 个文件`}</button>
          {archive && <a className="audio-download" href={archive} download="assan-flac.zip">下载选中的文件（ZIP）</a>}
        </div>}
        {archiveError && <p role="alert" className="audio-error">{archiveError}</p>}
        <ul className="audio-queue" aria-label="转换文件列表">
          {items.map((item, index) => <li key={index}>
            <p className="audio-filename"><FileAudio size={20} aria-hidden="true" /><span>{item.file.name}<small>{(item.file.size / 1024 / 1024).toFixed(2)} MiB</small></span></p>
            <p>{item.status}</p>
            {item.result && <label><input type="checkbox" aria-label={`选择下载 ${item.file.name}`} checked={!!item.selected} disabled={busy || packing} onChange={(event) => {
              clearArchive()
              const checked = event.target.checked
              setItems((current) => current.map((entry, i) => i === index ? { ...entry, selected: checked } : entry))
            }} />加入批量下载</label>}
            {(item.invalid || item.error) && <p role="alert" className="audio-error">{item.invalid || item.error}</p>}
            {item.result && <a className="audio-download" href={item.result.url} download={item.result.name}>下载 {item.result.name}（{(item.result.size / 1024 / 1024).toFixed(2)} MiB）</a>}
          </li>)}
        </ul>
      </div>
      <ul className="audio-notes">
        <li>M4A 是容器格式，支持其中的 AAC 和 ALAC 音频；转换第一条音轨，并保留内嵌封面及标题、歌手、专辑等常见标签。格式专有标签可能无法完整迁移。</li>
        <li>AAC 转 FLAC 不会恢复已丢失的音质，输出文件通常会变大。</li>
        <li>转换使用设备内存，大文件或长音频可能超出浏览器内存；手机建议使用较小文件。离开页面会取消转换并释放结果。</li>
      </ul>
    </section>
  )
}
