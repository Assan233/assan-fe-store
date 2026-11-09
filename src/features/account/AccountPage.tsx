import { useState, type FormEvent } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../app/useAuth'

export function AccountPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError && cause.code === 'invalid_password'
        ? '当前密码不正确，或新密码不符合要求。'
        : '修改密码失败，请检查网络后重试。')
      setSubmitting(false)
    }
  }

  return (
    <section className="account-page" aria-labelledby="account-title">
      <div className="section-kicker">YOUR ACCOUNT</div>
      <h1 id="account-title">账户设置</h1>
      <p className="account-lead">管理你的登录信息与账户安全。</p>
      <div className="account-card account-identity"><div className="account-icon"><ShieldCheck size={21} /></div><div><span>当前账户</span><strong>{user?.username}</strong></div><span className="identity-status"><i />已验证</span></div>
      <div className="account-card password-card"><div className="account-card-heading"><div className="account-icon"><KeyRound size={20} /></div><div><h2>修改密码</h2><p>修改后需要使用新密码重新登录。</p></div></div>
        <form onSubmit={handleSubmit} className="settings-form">
          <label htmlFor="current-password">当前密码</label><input id="current-password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.currentTarget.value)} />
          <label htmlFor="new-password">新密码 <span>至少 12 位</span></label><input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.currentTarget.value)} />
          {error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}
          <button type="submit" className="submit-button settings-submit" disabled={submitting}>{submitting ? '保存中…' : '更新密码'}</button>
        </form>
      </div>
      <p className="account-security-note"><ShieldCheck size={15} />密码经过加密保存，修改后会注销所有已登录设备。</p>
    </section>
  )
}
