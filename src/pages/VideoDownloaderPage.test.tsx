import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import VideoDownloaderPage from './VideoDownloaderPage'

vi.mock('../lib/api', async (original) => ({
  ...await original<typeof import('../lib/api')>(),
  api: { resolveVideo: vi.fn(), prepareVideo: vi.fn() },
}))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

function submitLink() {
  render(<MemoryRouter><VideoDownloaderPage /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('优酷视频链接'), { target: { value: 'https://v.youku.com/video' } })
  fireEvent.click(screen.getByRole('button', { name: '解析链接' }))
}

it('generates a browser download for the selected episode', async () => {
  vi.mocked(api.resolveVideo).mockResolvedValue([{ id: 'first', name: '第一集' }, { id: 'second', name: '第二集' }])
  vi.mocked(api.prepareVideo).mockResolvedValue({ id: 'ready' })
  submitLink()
  expect(api.resolveVideo).toHaveBeenCalledWith('https://v.youku.com/video', expect.any(AbortSignal))
  const selection = await screen.findByRole('combobox', { name: /选择剧集/ })
  fireEvent.change(selection, { target: { value: 'second' } })
  fireEvent.click(screen.getByRole('button', { name: '生成 MP4' }))
  expect(api.prepareVideo).toHaveBeenCalledWith('second', expect.any(AbortSignal))
  expect(await screen.findByRole('link', { name: '下载 MP4' })).toHaveAttribute('href', '/api/v1/video/file/ready')
})

it('cancels the active request and lets the user retry', () => {
  vi.mocked(api.resolveVideo).mockImplementation(() => new Promise(() => {}))
  submitLink()
  const signal = vi.mocked(api.resolveVideo).mock.calls[0][1]
  fireEvent.click(screen.getByRole('button', { name: '取消' }))
  expect(signal.aborted).toBe(true)
  expect(screen.getByRole('button', { name: '解析链接' })).toBeEnabled()
})
