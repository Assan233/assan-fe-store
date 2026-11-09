import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../app/useAuth'

export function LoginPage({ initializing = false }: { initializing?: boolean }) {
  const { signIn, setup } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mode = initializing ? 'signup' : 'login'
  const [confirmation, setConfirmation] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (initializing && password !== confirmation) { setError('两次输入的密码不一致。'); return }
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') await signIn(username.trim(), password)
      else await setup(username.trim(), password)
      navigate(destination, { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.code === 'invalid_credentials'
          ? '用户名或密码不正确，请检查后再试。'
          : cause.code === 'username_exists'
            ? '这个用户名已经被使用了。'
            : cause.code === 'invalid_input'
              ? `用户名需为 3–32 位字母、数字或下划线；密码${passwordRequirement}。`
              : cause.message)
      } else setError('暂时无法连接服务器，请稍后重试。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true"><div /><div /><div /></div>
      <Link to="/" className="auth-brand"><span className="brand-mark">A<span>.</span></span><span>assan <i>应用库</i></span></Link>
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-intro-kicker"><Sparkles size={14} /> YOUR PERSONAL TOOLKIT</div>
          <h1>把日常，<br /><span>整理得更轻松。</span></h1>
          <p>常用的小工具、灵光一闪的点子，<br />在一个属于你的空间里慢慢生长。</p>
          <div className="auth-decoration" aria-hidden="true"><span>✳</span><i /><i /><i /></div>
          <div className="auth-quote">“好的工具，让注意力回到重要的事。”</div>
        </section>
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-panel-top"><span className="auth-step">01 <i>/</i> 02</span><span className="secure-indicator"><span />安全连接</span></div>
          <div className="auth-form-heading"><span>{initializing ? '首次使用' : '欢迎回来'}</span><h2 id="auth-title">{initializing ? '设置管理员' : '登录应用库'}</h2><p>{initializing ? '为此 NAS 设置管理员账号。完成后仅管理员可以添加子账号。' : '使用管理员为你创建的账号登录。'}</p></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="username">用户名</label>
            <input id="username" name="username" autoComplete="username" required minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.currentTarget.value)} placeholder="3–32 位字母、数字或下划线" />
            <div className="password-label-row"><label htmlFor="password">密码</label></div>
            {initializing && <p>{passwordRequirement}</p>}
            <div className="password-field"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required {...(initializing ? newPasswordAttributes : { maxLength: 128 })} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder={mode === 'login' ? '请输入密码' : '请输入符合要求的密码'} /><button type="button" className="password-toggle" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏密码' : '显示密码'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {initializing && <><label htmlFor="confirmation">确认密码</label><input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="submit-button" type="submit" disabled={submitting}><span>{submitting ? '请稍候…' : initializing ? '创建管理员并进入' : '登录'}</span><ArrowRight size={17} /></button>
          </form>
          {!initializing && <p className="auth-privacy">没有账号或忘记密码？请联系管理员。</p>}
          <p className="auth-privacy">你的账户数据只用于保护个人工作空间。</p>
        </section>
      </div>
      <footer className="auth-footer"><span>ASSAN · 应用库</span><span>MADE FOR EVERYDAY MOMENTS</span></footer>
    </main>
  )
}
import { newPasswordAttributes, passwordRequirement } from '../../lib/password'
