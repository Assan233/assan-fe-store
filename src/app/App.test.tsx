import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, ApiError } from '../lib/api'
import { App } from './App'
import { AuthProvider } from './AuthProvider'

vi.mock('../lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, api: { ...actual.api, setupStatus: vi.fn(), me: vi.fn(), setup: vi.fn(), users: vi.fn() } }
})
beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

function open(path = '/') {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>)
}

it('requires first-admin setup before opening a protected page and then exposes management', async () => {
  vi.mocked(api.setupStatus).mockResolvedValue({ needsSetup: true })
  vi.mocked(api.users).mockResolvedValue([])
  vi.mocked(api.setup).mockResolvedValue({ id: 1, username: 'owner', role: 'admin', disabled: false })
  open('/users')
  expect(await screen.findByRole('heading', { name: '设置管理员' })).toBeInTheDocument()
  expect(api.me).not.toHaveBeenCalled()
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('用户名'), 'owner')
  await user.type(screen.getByLabelText('密码', { exact: true }), 'Owner-password-123')
  await user.type(screen.getByLabelText('确认密码'), 'Owner-password-123')
  await user.click(screen.getByRole('button', { name: '创建管理员并进入' }))
  expect(await screen.findByRole('link', { name: /用户管理/ })).toBeInTheDocument()
  expect(api.setup).toHaveBeenCalledWith('owner', 'Owner-password-123')
  expect(screen.queryByRole('heading', { name: '设置管理员' })).not.toBeInTheDocument()
})

it('blocks a member from directly opening user management', async () => {
  vi.mocked(api.setupStatus).mockResolvedValue({ needsSetup: false })
  vi.mocked(api.me).mockResolvedValue({ id: 2, username: 'member', role: 'member', disabled: false })
  open('/users')
  await screen.findByRole('link', { name: /账户设置/ })
  expect(screen.queryByRole('link', { name: /用户管理/ })).not.toBeInTheDocument()
  expect(api.users).not.toHaveBeenCalled()
})

it('does not expose administrator setup when the service is unavailable', async () => {
  vi.mocked(api.setupStatus).mockRejectedValue(new Error('unavailable'))
  open()
  expect(await screen.findByRole('alert')).toHaveTextContent('无法连接本地账号服务')
  expect(screen.queryByRole('heading', { name: '设置管理员' })).not.toBeInTheDocument()
})

it('shows login without public signup on an initialized installation', async () => {
  vi.mocked(api.setupStatus).mockResolvedValue({ needsSetup: false })
  vi.mocked(api.me).mockRejectedValue(new ApiError('请登录', 401, 'unauthorized'))
  open()
  expect(await screen.findByRole('heading', { name: '登录应用库' })).toBeInTheDocument()
  expect(screen.queryByText('创建管理员并进入')).not.toBeInTheDocument()
  expect(screen.getByText('没有账号或忘记密码？请联系管理员。')).toBeInTheDocument()
})
