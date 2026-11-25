import { useEffect, useState } from 'react'
import { ApiError, api, type NasConversion } from '../../lib/api'

const labels = { queued: '排队中', running: '转换中', completed: '已完成', failed: '失败' }

/** Loads server-side records and refreshes them while the converter is open. */
export function NasConversionHistory({ version }: { version: number }) {
  const [jobs, setJobs] = useState<NasConversion[]>()
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    async function load() {
      let delay = 10000
      try {
        const records = await api.nasConversions(controller.signal)
        if (controller.signal.aborted) return
        setJobs(records)
        setError('')
        if (records.some(({ status }) => status === 'queued' || status === 'running')) delay = 2000
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : '无法读取转换记录。')
        if (cause instanceof ApiError && [401, 403, 404, 503].includes(cause.status)) return
      }
      timer = window.setTimeout(() => void load(), delay)
    }
    void load()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [version, refresh])

  return <section className="nas-history" aria-label="NAS 转换记录">
    <header><h3>转换记录</h3><button type="button" className="nas-button" onClick={() => setRefresh((value) => value + 1)}>刷新记录</button></header>
    {error && <p role="alert" className="nas-feedback nas-feedback-error">{error}</p>}
    {!jobs && !error && <p role="status">正在读取转换记录…</p>}
    {jobs?.length === 0 && <p>暂无转换记录。</p>}
    {!!jobs?.length && <ul className="nas-history-list">
      {jobs.map((job) => <li key={job.id}>
        <div className="nas-history-meta"><span className="nas-job-status" data-status={job.status}>{labels[job.status]}</span><time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString()}</time></div>
        <strong>{job.source}</strong>
        {job.path ? <span>已保存：{job.path}</span> : <span>输出目录：{job.directory === '.' ? 'NAS 根目录' : job.directory}</span>}
        {job.error && <span className="nas-job-error">{job.error}</span>}
      </li>)}
    </ul>}
  </section>
}
