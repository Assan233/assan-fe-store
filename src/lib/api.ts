export type User = { id: number; username: string; role: 'admin' | 'member'; disabled: boolean }
type Envelope<T> = { data: T }
type ErrorEnvelope = { error?: { code?: string; message?: string } }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...init.headers },
  })
  if (response.status === 204) return undefined as T

  let body: Envelope<T> & ErrorEnvelope
  try {
    body = await response.json() as Envelope<T> & ErrorEnvelope
  } catch {
    throw new ApiError('服务器返回了无法识别的响应，请稍后重试。', response.status)
  }
  if (!response.ok) {
    throw new ApiError(body.error?.message ?? '请求失败，请稍后重试。', response.status, body.error?.code)
  }
  if (!('data' in body)) throw new ApiError('服务器响应缺少 data 字段。', response.status)
  return body.data
}

async function csrfToken() {
  const result = await request<{ token: string }>('/api/v1/auth/csrf')
  return result.token
}

async function mutate<T>(path: string, body?: unknown): Promise<T> {
  const token = await csrfToken()
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function remove(path: string): Promise<void> {
  const token = await csrfToken()
  return request<void>(path, { method: 'DELETE', headers: { 'X-CSRF-Token': token } })
}

export const api = {
  musicCredentialStatus: () => request<{ configured: boolean }>('/api/v1/music/credential'),
  saveMusicCredential: (username: string, password: string) => mutate<void>('/api/v1/music/credential', { username, password }),
  deleteMusicCredential: () => remove('/api/v1/music/credential'),
  me: () => request<User>('/api/v1/auth/me'),
  signIn: (username: string, password: string) => mutate<User>('/api/v1/auth/login', { username, password }),
  setupStatus: () => request<{ needsSetup: boolean }>('/api/v1/auth/setup'),
  setup: (username: string, password: string) => mutate<User>('/api/v1/auth/setup', { username, password }),
  users: () => request<User[]>('/api/v1/admin/users'),
  createMember: (username: string, password: string) => mutate<void>('/api/v1/admin/users', { username, password }),
  manageMember: (id: number, action: 'disable' | 'enable' | 'delete' | 'reset-password', password?: string) => mutate<void>(`/api/v1/admin/users/${id}`, { action, password }),
  signOut: () => mutate<void>('/api/v1/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    mutate<void>('/api/v1/auth/password', { currentPassword, newPassword }),
}
