import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { NasMediaForm } from './NasMediaForm'

vi.mock('../../lib/api', () => ({ api: { nasEntries: vi.fn(), nasConvert: vi.fn(), nasRename: vi.fn() } }))

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

it('mixes file and folder selections, including nested videos once, and continues after a conversion fails', async () => {
  vi.mocked(api.nasEntries).mockImplementation(async (path, kind) => {
    if (path === '.') return kind === 'folder' ? [{ name: 'Music', directory: true }]
      : [{ name: 'a.mp4', directory: false }, { name: 'Videos', directory: true }]
    if (path === 'Videos') return [{ name: 'b.mkv', directory: false }, { name: 'Nested', directory: true }]
    if (path === 'Videos/Nested') return [{ name: 'c.mp4', directory: false }]
    return []
  })
  let finishFirst = () => {}
  vi.mocked(api.nasConvert).mockImplementationOnce(() => new Promise((resolve) => {
    finishFirst = () => resolve({ path: 'Music/a.mp3' })
  })).mockRejectedValueOnce(new Error('目标文件已存在')).mockResolvedValueOnce({ path: 'Music/c.mp3' })

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
  fireEvent.click(screen.getByRole('button', { name: '转换并保存到 NAS' }))
  await screen.findByText(/正在转换 1\/3：a.mp4/)
  expect(vi.mocked(api.nasConvert).mock.calls.map(([path, directory]) => [path, directory])).toEqual([['a.mp4', 'Music']])
  await act(async () => { finishFirst() })

  expect(await screen.findByText('已保存 2/3 个 MP3 到 NAS：Music')).toBeInTheDocument()
  expect(screen.getByText('Videos/b.mkv')).toBeInTheDocument()
  expect(vi.mocked(api.nasConvert).mock.calls.map(([path, directory]) => [path, directory])).toEqual([
    ['a.mp4', 'Music'], ['Videos/b.mkv', 'Music'], ['Videos/Nested/c.mp4', 'Music'],
  ])
})
