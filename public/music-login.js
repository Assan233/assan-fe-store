// Runs in the proxied player document so credentials never enter the iframe URL.
{
  let started = false
  const tryLogin = async () => {
    if (started || location.pathname !== '/music/login') return
    started = true
    try {
      const response = await fetch('/api/v1/music/credential?login', { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) return
      const { data } = await response.json()
      const find = (placeholder) => [...document.querySelectorAll('input')].find(input => input.placeholder === placeholder)
      let attempts = 0
      const timer = setInterval(() => {
        if (++attempts > 80 || location.pathname !== '/music/login') { clearInterval(timer); return }
        const username = find('请输入用户名')
        const password = find('请输入密码')
        if (!username || !password) return
        clearInterval(timer)
        const set = (input, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }
        set(username, data.username)
        set(password, data.password)
        // Let React commit the controlled input state before invoking submit.
        setTimeout(() => password.closest('form')?.requestSubmit(), 100)
      }, 250)
    } catch { /* User can still log in manually. */ }
  }
  let routeAttempts = 0
  const routeTimer = setInterval(() => {
    if (started || ++routeAttempts > 120 || location.pathname === '/music/login') {
      clearInterval(routeTimer)
      void tryLogin()
    }
  }, 250)
}
