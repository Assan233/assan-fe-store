import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AudioConverterPage from './AudioConverterPage'
import { convertToFlac } from '../features/audio/convert'
import { archiveAudio } from '../features/audio/archive'

vi.mock('../features/audio/archive', () => ({ archiveAudio: vi.fn() }))

vi.mock('../features/audio/convert', async (original) => ({
  ...await original<typeof import('../features/audio/convert')>(),
  convertToFlac: vi.fn(),
}))

const convert = vi.mocked(convertToFlac)
const revoke = vi.fn()

function choose(name = 'song.m4a', contents = 'audio') {
  fireEvent.change(screen.getByLabelText('选择 M4A 音频'), {
    target: { files: [new File([contents], name, { type: 'audio/mp4' })] },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:converted'), revokeObjectURL: revoke }))
  render(<MemoryRouter><AudioConverterPage /></MemoryRouter>)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('local audio workflow', () => {
  it('processes multiple files sequentially, continues after failure, and packs only selected results', async () => {
    convert.mockRejectedValueOnce(new Error('损坏的文件'))
      .mockResolvedValueOnce(new Blob(['one']))
      .mockResolvedValueOnce(new Blob(['two']))
    vi.mocked(archiveAudio).mockResolvedValue(new Blob(['zip']))
    fireEvent.change(screen.getByLabelText('选择 M4A 音频'), {
      target: { files: ['bad.m4a', 'one.m4a', 'two.m4a'].map((name) => new File(['audio'], name)) },
    })
    expect(screen.getByLabelText('选择 M4A 音频')).toHaveAttribute('multiple')
    fireEvent.click(screen.getByRole('button', { name: '开始转换' }))
    await screen.findByRole('link', { name: /下载 two.flac/ })
    expect(screen.getByRole('alert')).toHaveTextContent('损坏的文件')
    expect(convert.mock.calls.map(([file]) => file.name)).toEqual(['bad.m4a', 'one.m4a', 'two.m4a'])
    fireEvent.click(screen.getByRole('checkbox', { name: '选择下载 one.m4a' }))
    fireEvent.click(screen.getByRole('button', { name: '打包选中 1 个文件' }))
    expect(await screen.findByRole('link', { name: '下载选中的文件（ZIP）' })).toHaveAttribute('download', 'assan-flac.zip')
    expect(vi.mocked(archiveAudio).mock.calls[0][0].map((file) => file.name)).toEqual(['two.flac'])
    fireEvent.click(screen.getByRole('checkbox', { name: '全选已完成文件' }))
    expect(screen.queryByRole('link', { name: '下载选中的文件（ZIP）' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打包选中 2 个文件' })).toBeEnabled()
  })
  it('rejects invalid and empty files without starting conversion', () => {
    choose('song.mp3')
    expect(screen.getByRole('alert')).toHaveTextContent('请选择 .m4a')
    expect(screen.getByRole('button', { name: '开始转换' })).toBeDisabled()
    choose('empty.m4a', '')
    expect(screen.getByRole('alert')).toHaveTextContent('文件为空')
    expect(convert).not.toHaveBeenCalled()
  })

  it('offers a FLAC download and releases it when the selection changes', async () => {
    convert.mockResolvedValue(new Blob(['fLaC']))
    choose('录音.M4A')
    fireEvent.click(screen.getByRole('button', { name: '开始转换' }))
    const link = await screen.findByRole('link', { name: /下载/ })
    expect(link).toHaveAttribute('download', '录音.flac')
    choose()
    expect(revoke).toHaveBeenCalledWith('blob:converted')
    expect(screen.queryByRole('link', { name: /下载/ })).not.toBeInTheDocument()
  })

  it('ignores a canceled result and allows retrying', async () => {
    let finish: ((blob: Blob) => void) | undefined
    convert.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    choose()
    fireEvent.click(screen.getByRole('button', { name: '开始转换' }))
    const signal = convert.mock.calls[0][1]
    fireEvent.click(screen.getByRole('button', { name: '取消转换' }))
    expect(signal.aborted).toBe(true)
    await act(async () => { finish?.(new Blob(['stale'])) })
    expect(screen.queryByRole('link', { name: /下载/ })).not.toBeInTheDocument()
    convert.mockRejectedValueOnce(new Error('无法转换此文件'))
    fireEvent.click(screen.getByRole('button', { name: '开始转换' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('无法转换此文件'))
    expect(screen.getByRole('button', { name: '开始转换' })).toBeEnabled()
  })
})
