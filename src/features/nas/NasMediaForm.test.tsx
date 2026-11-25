import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, type NasConversion } from '../../lib/api'
import { NasMediaForm } from './NasMediaForm'

vi.mock('../../lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/api')>(),
  api: { nasEntries: vi.fn(), nasConvert: vi.fn(), nasSetTitle: vi.fn(), nasConversions: vi.fn() },
}))

beforeEach(() => {
  // jsdom exposes <dialog> but does not implement its modal actions.
  vi.stubGlobal('HTMLDialogElement', HTMLDialogElement)
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; fireEvent(this, new Event('close')) } },
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

it('queues unique nested videos, continues after a submission error and renders server-side results', async () => {
  vi.mocked(api.nasEntries).mockImplementation(async (path, kind) => {
    if (path === '.') return kind === 'folder' ? [{ name: 'Music', directory: true }]
      : [{ name: 'a.mp4', directory: false }, { name: 'Videos', directory: true }]
    if (path === 'Videos') return [{ name: 'b.mkv', directory: false }, { name: 'Nested', directory: true }]
    if (path === 'Videos/Nested') return [{ name: 'c.mp4', directory: false }]
    return []
  })
  let finishFirst = () => {}
  const first: NasConversion = { id: 1, source: 'a.mp4', directory: 'Music', status: 'queued', createdAt: '2026-11-25T03:00:00Z' }
  const last: NasConversion = { ...first, id: 2, source: 'Videos/Nested/c.mp4', status: 'running' }
  vi.mocked(api.nasConversions).mockResolvedValueOnce([]).mockResolvedValueOnce([last, first]).mockResolvedValue([
    { ...last, status: 'failed', error: '目标文件已存在' }, { ...first, status: 'completed', path: 'Music/a.mp3' },
  ])
  vi.mocked(api.nasConvert).mockImplementationOnce(() => new Promise((resolve) => {
    finishFirst = () => resolve(first)
  })).mockRejectedValueOnce(new Error('提交失败')).mockResolvedValueOnce({ ...last, status: 'queued' })

  render(<NasMediaForm mode="convert" />)
  fireEvent.click(screen.getByRole('button', { name: /浏览 NAS NAS 视频/ }))
  const source = within(screen.getByRole('dialog'))
  fireEvent.click(await source.findByRole('button', { name: 'a.mp4' }))
  fireEvent.click(source.getByRole('button', { name: 'Videos' }))
  fireEvent.click(source.getByRole('button', { name: '展开 Videos' }))
  fireEvent.click(await source.findByRole('button', { name: 'b.mkv' }))
  expect(source.getByRole('status')).toHaveTextContent('已选 2 个文件、1 个文件夹')
  fireEvent.click(source.getByRole('button', { name: '确认选择' }))

  fireEvent.click(screen.getByRole('button', { name: /浏览 NAS NAS 输出/ }))
  const output = within(screen.getByRole('dialog'))
  fireEvent.click(await output.findByRole('button', { name: 'Music' }))
  fireEvent.click(output.getByRole('button', { name: '确认选择' }))
  fireEvent.click(screen.getByRole('button', { name: '提交转换任务' }))
  await screen.findByText(/正在提交 1\/3：a.mp4/)
  expect(vi.mocked(api.nasConvert).mock.calls.map(([path, directory]) => [path, directory])).toEqual([['a.mp4', 'Music']])
  await act(async () => { finishFirst() })

  expect(await screen.findByText(/已提交 2\/3 个转换任务/)).toBeInTheDocument()
  expect(screen.getByText('Videos/b.mkv')).toBeInTheDocument()
  expect(vi.mocked(api.nasConvert).mock.calls.map(([path, directory]) => [path, directory])).toEqual([
    ['a.mp4', 'Music'], ['Videos/b.mkv', 'Music'], ['Videos/Nested/c.mp4', 'Music'],
  ])
  expect(await screen.findByText('排队中')).toBeInTheDocument()
  expect(screen.getByText('转换中')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '刷新记录' }))
  expect(await screen.findByText('已保存：Music/a.mp3')).toBeInTheDocument()
  expect(screen.getByText('目标文件已存在')).toBeInTheDocument()
})

it('writes titles for selected audio and nested folders once, showing changes and failures', async () => {
  vi.mocked(api.nasEntries).mockImplementation(async (path, kind) => {
    if (kind !== 'audio') return []
    switch (path) {
      case '.': return [{ name: 'track.mp3', directory: false }, { name: 'Music', directory: true }]
      case 'Music': return [{ name: 'untitled.flac', directory: false }, { name: 'Album', directory: true }, { name: 'Restricted', directory: true }]
      case 'Music/Album': return [{ name: 'Song.m4a', directory: false }]
      default: throw new Error('目录不可读')
    }
  })
  vi.mocked(api.nasSetTitle).mockImplementation(async (source) => {
    if (source === 'Music/untitled.flac') throw new Error('无法写入标签')
    return { path: source, title: source === 'track.mp3' ? 'track' : 'Song', changed: source === 'track.mp3' }
  })

  render(<NasMediaForm mode="title" />)
  fireEvent.click(screen.getByRole('button', { name: /浏览 NAS NAS 音频/ }))
  const picker = within(screen.getByRole('dialog'))
  fireEvent.click(await picker.findByRole('button', { name: 'track.mp3' }))
  fireEvent.click(picker.getByRole('button', { name: 'Music' }))
  fireEvent.click(picker.getByRole('button', { name: '展开 Music' }))
  fireEvent.click(await picker.findByRole('button', { name: 'untitled.flac' }))
  fireEvent.click(picker.getByRole('button', { name: '确认选择' }))
  fireEvent.click(screen.getByRole('button', { name: '写入歌曲标题' }))

  expect(await screen.findByText('已更新 1 个歌曲标题，1 个标题已与文件名一致。')).toBeInTheDocument()
  fireEvent.click(screen.getByText('查看标题写入结果'))
  expect(screen.getByText('track')).toBeVisible()
  expect(screen.getByText(/无法写入标签/)).toBeInTheDocument()
  expect(screen.getByText(/目录不可读/)).toBeInTheDocument()
  expect(vi.mocked(api.nasSetTitle).mock.calls.map(([source]) => source)).toEqual([
    'track.mp3', 'Music/untitled.flac', 'Music/Album/Song.m4a',
  ])
})
