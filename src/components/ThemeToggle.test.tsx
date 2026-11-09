import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

afterEach(() => {
  cleanup()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

it('follows system changes, allows overriding them, and restores the saved preference', () => {
  let listener = () => {}
  const media = { matches: true, addEventListener: vi.fn((_event, callback) => { listener = callback }), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => media)
  const view = render(<ThemeToggle />)
  expect(document.documentElement.dataset.theme).toBe('dark')
  act(() => { media.matches = false; listener() })
  expect(document.documentElement.dataset.theme).toBe('light')
  fireEvent.click(screen.getByRole('button', { name: /切换为浅色/ }))
  act(() => { media.matches = true; listener() })
  expect(document.documentElement.dataset.theme).toBe('light')
  fireEvent.click(screen.getByRole('button', { name: /切换为深色/ }))
  expect(localStorage.getItem('assan-theme')).toBe('dark')
  view.unmount()
  render(<ThemeToggle />)
  expect(screen.getByRole('button', { name: /当前主题：深色/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /切换为跟随系统/ }))
  act(() => { media.matches = false; listener() })
  expect(document.documentElement.dataset.theme).toBe('light')
})
