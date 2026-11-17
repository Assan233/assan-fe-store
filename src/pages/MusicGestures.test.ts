import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { afterEach, expect, it } from 'vitest'

const script = readFileSync(resolve(process.cwd(), 'public/music-gestures.js'), 'utf8')
let page: JSDOM | undefined

afterEach(() => { page?.window.close(); page = undefined })

function touch(zone: Element, x1: number, y1: number, x2: number, y2: number) {
  const window = zone.ownerDocument.defaultView!
  const point = (x: number, y: number) => ({ identifier: 1, clientX: x, clientY: y })
  const dispatch = (type: string, touches: object[], changedTouches: object[]) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } })
    zone.dispatchEvent(event)
  }
  dispatch('touchstart', [point(x1, y1)], [point(x1, y1)])
  dispatch('touchend', [], [point(x2, y2)])
}

it('仅在移动播放器页面提供手势区，并把滑动、双击、键盘操作映射到现有按钮', async () => {
  page = new JSDOM('<!doctype html><body></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  let mobile = true
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ get matches() { return mobile }, addEventListener: () => {} }),
  })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  window.eval(script)
  const controls = window.document.createElement('div')
  controls.className = 'flex h-14 w-full items-center justify-between'
  controls.innerHTML = '<button>其他</button><button>上一首</button><button>播放</button><button>下一首</button>'
  const counts = [0, 0, 0]
  controls.querySelectorAll('button').forEach((button, index) => {
    if (index > 0) button.addEventListener('click', () => { counts[index - 1]++ })
  })
  window.document.body.append(controls)
  await new Promise(resolve => window.setTimeout(resolve, 20))
  const zone = window.document.querySelector('.assan-gesture-zone')!
  expect(zone).not.toBeNull()
  expect(zone.getAttribute('aria-label')).toContain('上划上一首')
  expect(zone.querySelector('.assan-gesture-disc-symbol')?.textContent).toBe('♫')
  expect(zone.querySelectorAll('.assan-gesture-item')).toHaveLength(4)

  const point = (x: number, y: number) => ({ identifier: 1, clientX: x, clientY: y })
  const move = (type: string, x: number, y: number) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true })
    Object.defineProperties(event, {
      touches: { value: [point(x, y)] }, changedTouches: { value: [point(x, y)] },
    })
    zone.dispatchEvent(event)
  }
  move('touchstart', 40, 120)
  move('touchmove', 40, 80)
  expect(zone.querySelector('[data-action="previous"]')?.classList.contains('assan-gesture-item-preview')).toBe(true)
  expect(zone.querySelector('.assan-gesture-disc-label')?.textContent).toBe('播放')
  expect(zone.classList.contains('assan-gesture-dragging')).toBe(false)
  expect((zone as HTMLElement).style.getPropertyValue('--drag-y')).toBe('')
  move('touchmove', 80, 80)
  expect(zone.querySelector('.assan-gesture-item-preview')).toBeNull()
  expect(zone.querySelector('.assan-gesture-disc-symbol')?.textContent).toBe('♫')
  zone.dispatchEvent(Object.assign(new window.Event('touchend', { bubbles: true, cancelable: true }), { touches: [], changedTouches: [point(45, 40)] }))
  expect(zone.classList.contains('assan-gesture-triggered')).toBe(false)
  expect(zone.querySelector('.assan-gesture-item-preview')).toBeNull()
  expect(zone.querySelector('.assan-gesture-disc-label')?.textContent).toBe('播放')
  expect(window.document.querySelector('.assan-toast-copy')?.textContent).toBe('本地操作上一首')
  touch(zone, 40, 40, 45, 120)
  expect(zone.hasAttribute('data-feedback')).toBe(false)
  expect(zone.querySelector('.assan-gesture-item-active')).toBeNull()
  expect(window.document.querySelector('.assan-toast-copy')?.textContent).toBe('本地操作下一首')
  touch(zone, 40, 40, 100, 45) // 没有收藏按钮时不切歌
  touch(zone, 40, 40, 42, 42)
  expect(counts).toEqual([1, 0, 1]) // 单击不播放
  touch(zone, 41, 41, 43, 43)
  expect(counts).toEqual([1, 1, 1])
  zone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  expect(counts).toEqual([2, 1, 1])
  expect(window.document.querySelectorAll('.assan-remote-toast')).toHaveLength(1)
  expect(window.document.querySelector('.assan-toast-copy')?.textContent).toBe('本地操作上一首')
  expect(window.document.querySelector('.assan-remote-toast')?.getAttribute('role')).toBe('status')
  expect(zone.hasAttribute('data-feedback')).toBe(false)

  window.history.pushState({}, '', '/music/login')
  window.document.body.append(window.document.createElement('div')) // SPA 导航触发 DOM 更新
  await new Promise(resolve => window.setTimeout(resolve, 20))
  expect(window.document.querySelector('.assan-gesture-zone')).toBeNull()
  mobile = false
  window.history.pushState({}, '', '/music/')
  window.document.body.append(window.document.createElement('div'))
  await new Promise(resolve => window.setTimeout(resolve, 20))
  expect(window.document.querySelector('.assan-gesture-zone')).toBeNull()
})

it('右划收藏，左划依次查询最新播放歌曲并请求永久删除', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div><button type="button" aria-label="收藏" title="收藏">收藏</button></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  const clicks: string[] = []
  const calls: Array<{ url: string, options: RequestInit }> = []
  const { document } = window
  document.querySelector('button[type="button"][aria-label="收藏"][title="收藏"]')!.addEventListener('click', () => { clicks.push('like') })
  document.querySelectorAll('.flex button')[3].addEventListener('click', () => { clicks.push('next') })
  Object.defineProperty(window, 'fetch', { value: async (url: string, options: RequestInit) => {
    calls.push({ url, options })
    if (url.includes('folder-view/delete')) clicks.push('deleted')
    return { ok: true, json: async () => ({ code: 0, data: url.includes('play-history') ? { list: [{ guid: 'valid-guid-123' }] } : {} }) }
  } })
  window.eval(script)
  await new Promise(resolve => window.setTimeout(resolve, 20))
  const zone = document.querySelector('.assan-gesture-zone')!
  touch(zone, 30, 40, 100, 40)
  touch(zone, 100, 40, 30, 40)
  await new Promise(resolve => window.setTimeout(resolve, 50))
  expect(clicks).toEqual(['like', 'deleted', 'next'])
  expect(document.querySelectorAll('.assan-remote-toast')).toHaveLength(1)
  expect(document.querySelector('.assan-toast-copy')?.textContent).toBe('本地操作删除歌曲')
  expect(document.querySelector('.assan-remote-toast')?.getAttribute('data-action')).toBe('delete')
  expect(zone.hasAttribute('data-feedback')).toBe(false)
  expect(zone.querySelector('.assan-gesture-item-active')).toBeNull()
  expect(zone.querySelector('.assan-gesture-disc-symbol')?.textContent).toBe('♫')
  expect(calls.map(({ url }) => url)).toEqual([
    '/music/api/v1/play-history/list?page=1&size=1',
    '/music/api/v1/folder-view/delete',
  ])
  expect(calls[1].options).toMatchObject({ method: 'POST', credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ folderPaths: [], isPermanent: true, trackGUIDs: ['valid-guid-123'] }) })
  for (const { url, options } of calls) {
    const header = (options.headers as Record<string, string>).authx
    const match = header.match(/^nonce=(\d{6})&timestamp=(\d+)&sign=([0-9a-f]{32})$/)
    expect(match).not.toBeNull()
    const [, nonce, timestamp, sign] = match!
    const hash = (text: string) => createHash('md5').update(text).digest('hex')
    const path = new URL(url, 'https://example.test').pathname
    const payload = options.method === 'POST' ? options.body as string : 'page=1&size=1'
    expect(sign).toBe(hash(['NDzZTVxnRKP8Z0jXg1VAMonaG8akvh', path, nonce, timestamp, hash(payload), '6D5602D4-A342-4799-A0F0-BB795E7167D0'].join('_')))
  }
})

it('远程收藏与删除由轮询执行并在接口成功后显示提示', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div><button type="button" aria-label="收藏" title="收藏"></button></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  let poll: (() => void) | undefined
  Object.defineProperty(window, 'setInterval', { value: (callback: () => void) => { poll = callback; return 1 } })
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  const actions = ['like', 'delete']
  const requests: string[] = []
  Object.defineProperty(window, 'fetch', { value: async (url: string) => {
    requests.push(url)
    return { ok: true, json: async () => url.startsWith('/api/') ? { data: { action: actions.shift() } } : { code: 0, data: url.includes('play-history') ? { list: [{ guid: 'guid-1' }] } : {} } }
  } })
  const clicks: string[] = []
  window.document.querySelector('button[type="button"][aria-label="收藏"][title="收藏"]')!.addEventListener('click', () => { clicks.push('like') })
  window.document.querySelectorAll('.flex button')[3].addEventListener('click', () => { clicks.push('next') })
  window.eval(script)
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  expect(clicks).toEqual(['like', 'next'])
  expect(requests).toEqual(['/api/v1/music/commands/next', '/api/v1/music/commands/next', '/music/api/v1/play-history/list?page=1&size=1', '/music/api/v1/folder-view/delete'])
  expect(window.document.querySelectorAll('.assan-remote-toast')).toHaveLength(1)
  expect(window.document.querySelector('.assan-toast-copy')?.textContent).toBe('远程控制删除歌曲')
})

it('无法获取歌曲 GUID 或删除接口失败时不提示删除成功', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  let poll: (() => void) | undefined
  Object.defineProperty(window, 'setInterval', { value: (callback: () => void) => { poll = callback; return 1 } })
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  const requests: string[] = []
  Object.defineProperty(window, 'fetch', { value: async (url: string) => {
    requests.push(url)
    return { ok: true, json: async () => url.startsWith('/api/') ? { data: { action: 'delete' } } : { code: 0, data: { list: [] } } }
  } })
  window.eval(script)
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  expect(requests).toEqual(['/api/v1/music/commands/next', '/music/api/v1/play-history/list?page=1&size=1'])
  expect(window.document.querySelectorAll('.assan-remote-toast')).toHaveLength(0)
})

it('飞牛音乐删除接口返回业务错误时不提示成功', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  let poll: (() => void) | undefined
  Object.defineProperty(window, 'setInterval', { value: (callback: () => void) => { poll = callback; return 1 } })
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  window.console.error = () => {}
  const requests: string[] = []
  let nextClicks = 0
  window.document.querySelectorAll('.flex button')[3].addEventListener('click', () => { nextClicks++ })
  Object.defineProperty(window, 'fetch', { value: async (url: string) => {
    requests.push(url)
    return { ok: true, json: async () => url.startsWith('/api/') ? { data: { action: 'delete' } } : url.includes('play-history') ? { code: 0, data: { list: [{ guid: 'guid-1' }] } } : { code: 500, msg: '删除失败' } }
  } })
  window.eval(script)
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  expect(requests).toHaveLength(3)
  expect(nextClicks).toBe(0)
  expect(window.document.querySelectorAll('.assan-remote-toast')).toHaveLength(0)
})
