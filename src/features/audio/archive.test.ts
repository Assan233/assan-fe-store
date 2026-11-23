// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { archiveAudio } from './archive'

describe('audio download archive', () => {
  it.each(['flac', 'mp3'])('preserves all bytes and disambiguates duplicate %s file names', async (extension) => {
    const archive = await archiveAudio([
      { name: `录音.${extension}`, blob: new Blob(['first']) },
      { name: `录音.${extension}`, blob: new Blob(['second']) },
      { name: `录音 (2).${extension}`, blob: new Blob(['third']) },
    ])
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()))
    expect(Object.keys(files)).toEqual([`录音.${extension}`, `录音 (2).${extension}`, `录音 (2) (2).${extension}`])
    expect(Object.values(files).map((bytes) => new TextDecoder().decode(bytes))).toEqual(['first', 'second', 'third'])
  })
})
