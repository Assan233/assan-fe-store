import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  touch(zone, 40, 120, 45, 40)
  touch(zone, 40, 40, 45, 120)
  touch(zone, 40, 40, 100, 45) // 没有收藏按钮时不切歌
  touch(zone, 40, 40, 42, 42)
  expect(counts).toEqual([1, 0, 1]) // 单击不播放
  touch(zone, 41, 41, 43, 43)
  expect(counts).toEqual([1, 1, 1])
  zone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  expect(counts).toEqual([2, 1, 1])

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

it('右划收藏，左划等待删除文件与确认按钮出现后依次点击', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div><button class="fn-like-button">收藏</button><button class="fn-delete-button">删除</button></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  const clicks: string[] = []
  const { document } = window
  document.querySelector('.fn-like-button')!.addEventListener('click', () => { clicks.push('like') })
  document.querySelector('.fn-delete-button')!.addEventListener('click', () => {
    clicks.push('delete')
    window.setTimeout(() => {
      const file = document.createElement('button')
      file.className = 'fn-delete-file-button'
      file.addEventListener('click', () => {
        clicks.push('file')
        window.setTimeout(() => {
          const confirm = document.createElement('button')
          confirm.className = 'fn-dialog-delete-confirm-button'
          confirm.addEventListener('click', () => { clicks.push('confirm') })
          document.body.append(confirm)
        }, 0)
      })
      document.body.append(file)
    }, 0)
  })
  window.eval(script)
  await new Promise(resolve => window.setTimeout(resolve, 20))
  const zone = document.querySelector('.assan-gesture-zone')!
  touch(zone, 30, 40, 100, 40)
  touch(zone, 100, 40, 30, 40)
  await new Promise(resolve => window.setTimeout(resolve, 50))
  expect(clicks).toEqual(['like', 'delete', 'file', 'confirm'])
})

it('远程收藏与删除由轮询执行并在操作完成后显示提示', async () => {
  page = new JSDOM('<!doctype html><body><div class="flex h-14 w-full items-center justify-between"><button></button><button></button><button></button><button></button></div><button class="fn-like-button"></button><button class="fn-delete-button"></button><button class="fn-delete-file-button"></button><button class="fn-dialog-delete-confirm-button"></button></body>', {
    url: 'https://example.test/music/', runScripts: 'dangerously',
  })
  const { window } = page
  let poll: (() => void) | undefined
  Object.defineProperty(window, 'setInterval', { value: (callback: () => void) => { poll = callback; return 1 } })
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener: () => {} }) })
  Object.defineProperty(window, 'requestAnimationFrame', { value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0) })
  const actions = ['like', 'delete']
  Object.defineProperty(window, 'fetch', { value: async () => ({ ok: true, json: async () => ({ data: { action: actions.shift() } }) }) })
  const clicks: string[] = []
  for (const selector of ['.fn-like-button', '.fn-delete-button', '.fn-delete-file-button', '.fn-dialog-delete-confirm-button']) {
    window.document.querySelector(selector)!.addEventListener('click', () => { clicks.push(selector) })
  }
  window.eval(script)
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  poll!()
  await new Promise(resolve => window.setTimeout(resolve, 10))
  expect(clicks).toEqual(['.fn-like-button', '.fn-delete-button', '.fn-delete-file-button', '.fn-dialog-delete-confirm-button'])
  expect(window.document.querySelectorAll('.assan-remote-toast')).toHaveLength(2)
})
