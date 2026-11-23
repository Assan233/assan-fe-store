import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, type VideoEpisode } from '../lib/api'
import './community-tools.css'

/** Resolves a Youku link and prepares a single episode for browser download. */
export default function VideoDownloaderPage() {
  const [url, setUrl] = useState('')
  const [episodes, setEpisodes] = useState<VideoEpisode[]>([])
  const [episodeId, setEpisodeId] = useState('')
  const [fileId, setFileId] = useState('')
  const [phase, setPhase] = useState<'resolve' | 'prepare' | null>(null)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  useEffect(() => {
    if (!fileId) return
    const timer = window.setTimeout(() => {
      setFileId('')
      setError('下载链接已过期，请重新生成 MP4。')
    }, 5 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [fileId])

  async function run(next: NonNullable<typeof phase>, action: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setError('')
    setFileId('')
    setPhase(next)
    try {
      await action(controller.signal)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof ApiError ? err.message : '无法连接视频服务，请稍后重试。')
      }
    } finally {
      if (active.current === controller) {
        active.current = null
        if (!controller.signal.aborted) setPhase(null)
      }
    }
  }

  function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run('resolve', async (signal) => {
      setEpisodes([])
      setEpisodeId('')
      const items = await api.resolveVideo(url.trim(), signal)
      if (signal.aborted) return
      setEpisodes(items)
      setEpisodeId(items[0]?.id ?? '')
    })
  }

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run('prepare', async (signal) => {
      const file = await api.prepareVideo(episodeId, signal)
      if (!signal.aborted) setFileId(file.id)
    })
  }

  function cancel() {
    active.current?.abort()
    active.current = null
    setPhase(null)
  }

  return (
    <div className="community-tool">
      <Link className="community-back" to="/">← 返回应用库</Link>
      <header className="community-header">
        <span className="section-kicker">VIDEO TOOL</span>
        <h1>视频下载助手</h1>
        <p>粘贴优酷视频链接，选择剧集，由服务端生成 MP4。</p>
      </header>
      <form className="community-panel community-form" onSubmit={resolve}>
        <label htmlFor="video-url">优酷视频链接</label>
        <input id="video-url" type="url" value={url} placeholder="https://v.youku.com/…" required maxLength={4096}
          disabled={phase !== null || !!fileId} onChange={(event) => {
            setUrl(event.currentTarget.value)
            setEpisodes([])
            setEpisodeId('')
            setError('')
          }} />
        <div className="community-actions">
          <button type="submit" disabled={phase !== null || !!fileId}>{phase === 'resolve' ? '正在解析…' : '解析链接'}</button>
        </div>
      </form>
      {episodes.length > 0 && (
        <form className="community-panel community-form" onSubmit={prepare}>
          <label htmlFor="video-episode">选择剧集（共 {episodes.length} 个）</label>
          <select id="video-episode" value={episodeId} disabled={phase !== null || !!fileId} onChange={(event) => {
            setEpisodeId(event.currentTarget.value)
            setError('')
          }}>
            {episodes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="community-actions">
            <button type="submit" disabled={phase !== null || !episodeId || !!fileId}>{phase === 'prepare' ? '正在生成 MP4…' : '生成 MP4'}</button>
          </div>
        </form>
      )}
      {phase && <div className="community-actions"><button type="button" onClick={cancel}>取消</button></div>}
      <div className="community-result" role="status">
        {phase === 'prepare' && <p>服务端正在下载并合并剧集，请保持页面打开，最长等待 4 分钟。</p>}
        {fileId && <p>MP4 已生成，下载链接 5 分钟内有效。{' '}
          <a href={`/api/v1/video/file/${encodeURIComponent(fileId)}`} download onClick={() => window.setTimeout(() => {
            setFileId((current) => current === fileId ? '' : current)
          }, 0)}>下载 MP4</a>
        </p>}
      </div>
      {error && <p className="community-error" role="alert">{error}</p>}
    </div>
  )
}
