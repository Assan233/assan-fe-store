import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

type Theme = 'system' | 'light' | 'dark'
const labels = { system: '跟随系统', light: '浅色', dark: '深色' }

/** Switches the global color theme and remembers the preference on this device. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('assan-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* Storage may be unavailable in private browsing. */ }
    return 'system'
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    try { localStorage.setItem('assan-theme', theme) } catch { /* The current session still uses the chosen theme. */ }
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const Icon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon
  return <button className="icon-button theme-toggle" type="button" aria-label={`当前主题：${labels[theme]}，切换为${labels[next]}`} title={`当前：${labels[theme]}，点击切换为${labels[next]}`} onClick={() => setTheme(next)}>
    <Icon size={18} aria-hidden="true" />
  </button>
}
