import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'

export default function MusicPage() {
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    api.musicCredentialStatus().then(({ configured }) => {
      if (alive) { setConfigured(configured); setLoading(false) }
    }).catch((cause: unknown) => {
      if (alive) { setError(cause instanceof Error ? cause.message : '无法读取音乐账号状态'); setLoading(false) }
    })
    return () => { alive = false }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.saveMusicCredential(username, password)
      setPassword('')
      setConfigured(true)
      setEditing(false)
      document.cookie = 'music-token=; Path=/; Max-Age=0; SameSite=Strict'
      setVersion(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存音乐账号失败')
    } finally { setBusy(false) }
  }

  async function forget() {
    setBusy(true)
    setError('')
    try {
      await api.deleteMusicCredential()
      document.cookie = 'music-token=; Path=/; Max-Age=0; SameSite=Strict'
      setConfigured(false)
      setVersion(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除音乐账号失败')
    } finally { setBusy(false) }
  }

  function preparePlayer(event: React.SyntheticEvent<HTMLIFrameElement>) {
    // The dev proxy serves upstream HTML unchanged; inject the same assets as Nginx.
    if (!import.meta.env.DEV) return
    try {
      const doc = event.currentTarget.contentDocument
      if (!doc || !doc.head || doc.querySelector('script[src="/music-login.js"]')) return
      const css = doc.createElement('link')
      css.rel = 'stylesheet'
      css.href = '/music-custom.css'
      doc.head.append(css)
      const script = doc.createElement('script')
      script.src = '/music-login.js'
      doc.head.append(script)
      const gestures = doc.createElement('script')
      gestures.src = '/music-gestures.js'
      doc.head.append(gestures)
    } catch { /* The production proxy injects the assets into the HTML response. */ }
  }

  return <main className="music-page">
    <h1 className="sr-only">飞牛音乐</h1>
    <header className="music-toolbar">
      <button type="button" aria-expanded={editing} aria-controls="music-settings" onClick={() => setEditing(value => !value)}>音乐账号设置</button>
    </header>
    {error && <p className="music-error" role="alert">{error}</p>}
    {editing && <section id="music-settings" className="music-settings" aria-label="音乐账号设置">
      <form onSubmit={save}>
        <label htmlFor="music-username">飞牛音乐用户名</label>
        <input id="music-username" autoComplete="username" value={username} maxLength={128} required onChange={event => setUsername(event.target.value)} />
        <label htmlFor="music-password">飞牛音乐密码</label>
        <input id="music-password" type="password" autoComplete="current-password" value={password} maxLength={512} required onChange={event => setPassword(event.target.value)} />
        <button disabled={busy} type="submit">保存并登录</button>
        {configured && <button disabled={busy} type="button" onClick={() => void forget()}>删除已保存的音乐账号</button>}
      </form>
      <p>账号仅供你本人使用；密码加密存储在应用库后端。修改后播放器会重新登录。</p>
    </section>}
    {loading ? <p className="music-message">正在检查音乐账号…</p> : configured
      ? <iframe key={version} className="music-player" title="飞牛音乐播放器" src="/music/" onLoad={preparePlayer} allow="autoplay; fullscreen; picture-in-picture" />
      : <div className="music-message"><p>先设置飞牛音乐账号，即可在此播放音乐。</p><button type="button" onClick={() => setEditing(true)}>设置音乐账号</button></div>}
  </main>
}
