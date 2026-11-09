import { useEffect, useState, type FormEvent } from 'react'
import { api, type User } from '../lib/api'
import './users.css'

/** Administrator-only account management; authorization is also enforced by the API. */
export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<User | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  async function refresh() { setUsers(await api.users()) }
  useEffect(() => {
    let active = true
    api.users().then(value => { if (active) setUsers(value) }).catch(() => {
      if (active) setError('无法加载用户，请刷新页面重试。')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function run(operation: () => Promise<void>, success: string) {
    setBusy(true); setError(''); setMessage('')
    try { await operation(); await refresh(); setMessage(success) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，请重试。') }
    finally { setBusy(false) }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => { await api.createMember(username.trim(), password); setUsername(''); setPassword('') }, '子账号已创建。')
  }

  return <section className="users-page" aria-labelledby="users-title">
    <header><h1 id="users-title">用户管理</h1><p>账号保存在你的 NAS 中。子账号可以使用所有工具，只有管理员可以管理用户。</p></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <section className="users-panel" aria-labelledby="create-title">
      <h2 id="create-title">添加子账号</h2>
      <form className="auth-form" onSubmit={create}>
        <label htmlFor="member-name">用户名</label><input id="member-name" autoComplete="off" required pattern="[A-Za-z0-9_]{3,32}" placeholder="3–32 位字母、数字或下划线" value={username} onChange={e => setUsername(e.target.value)} />
        <label htmlFor="member-password">初始密码</label><p>{passwordRequirement}</p><input id="member-password" type="password" autoComplete="new-password" required {...newPasswordAttributes} value={password} onChange={e => setPassword(e.target.value)} />
        <button className="submit-button" disabled={busy || loading}>添加子账号</button>
      </form>
    </section>
    {target && <section className="users-panel" aria-labelledby="reset-title">
      <h2 id="reset-title">重置 {target.username} 的密码</h2><p>重置后，该账号的所有登录会话将失效。</p>
      <form className="auth-form" onSubmit={e => { e.preventDefault(); void run(async () => { await api.manageMember(target.id, 'reset-password', resetPassword); setTarget(null); setResetPassword('') }, '密码已重置，旧会话已撤销。') }}>
        <label htmlFor="reset-password">新密码</label><p>{passwordRequirement}</p><input id="reset-password" type="password" autoComplete="new-password" required {...newPasswordAttributes} value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
        <button className="submit-button" disabled={busy}>确认重置</button><button type="button" disabled={busy} onClick={() => { setTarget(null); setResetPassword('') }}>取消</button>
      </form>
    </section>}
    <section aria-labelledby="members-title"><h2 id="members-title">全部账号</h2>
      {loading ? <p role="status">正在加载…</p> : <ul className="users-list">{users.map(user => <li key={user.id}>
        <div><strong>{user.username}</strong><p>{user.role === 'admin' ? '管理员' : '子账号'} · {user.disabled ? '已禁用' : '正常'}</p></div>
        {user.role === 'member' && <div className="users-actions">
          <button disabled={busy} onClick={() => void run(() => api.manageMember(user.id, user.disabled ? 'enable' : 'disable'), '账号状态已更新。')}>{user.disabled ? '启用' : '禁用'}</button>
          <button disabled={busy} onClick={() => { setTarget(user); setResetPassword('') }}>重置密码</button>
          <button disabled={busy} onClick={() => {
            if (window.confirm(`确定删除子账号 ${user.username}？此操作无法撤销。`)) void run(async () => { await api.manageMember(user.id, 'delete'); if (target?.id === user.id) { setTarget(null); setResetPassword('') } }, '子账号已删除。')
          }}>删除</button>
        </div>}
      </li>)}</ul>}
    </section>
  </section>
}
import { newPasswordAttributes, passwordRequirement } from '../lib/password'
