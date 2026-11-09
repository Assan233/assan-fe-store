// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { archiveAudio } from './archive'

describe('audio download archive', () => {
  it('preserves all bytes and disambiguates duplicate file names', async () => {
    const archive = await archiveAudio([
      { name: '录音.flac', blob: new Blob(['first']) },
      { name: '录音.flac', blob: new Blob(['second']) },
      { name: '录音 (2).flac', blob: new Blob(['third']) },
    ])
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()))
    expect(Object.keys(files)).toHaveLength(3)
    expect(Object.values(files).map((bytes) => new TextDecoder().decode(bytes))).toEqual(['first', 'second', 'third'])
  })
})
