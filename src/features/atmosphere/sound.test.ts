import { afterEach, expect, it, vi } from 'vitest'
import { createAtmosphereEngine } from './sound'

afterEach(() => vi.unstubAllGlobals())

it('starts four looping sounds, updates their levels, and closes the audio context', async () => {
  const sources: Array<{ loop: boolean; start: ReturnType<typeof vi.fn> }> = []
  const gains: Array<{ gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> } }> = []
  const close = vi.fn(async () => undefined)
  class FakeAudioContext {
    sampleRate = 100
    currentTime = 0
    state = 'running'
    destination = {}
    createBuffer() { return { getChannelData: () => new Float32Array(1200) } }
    createBufferSource() {
      const source = { buffer: null, loop: false, start: vi.fn(), connect: (next: unknown) => next }
      sources.push(source)
      return source
    }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect: (next: unknown) => next } }
    createGain() {
      const gain = { gain: { value: 0, setTargetAtTime: vi.fn() }, connect: (next: unknown) => next }
      gains.push(gain)
      return gain
    }
    resume = vi.fn(async () => undefined)
    close = close
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)

  const engine = await createAtmosphereEngine({ rain: 0.5, wind: 0, fire: 0, noise: 0 }, 0.6)
  expect(sources).toHaveLength(4)
  expect(sources.every((source) => source.loop && source.start.mock.calls.length === 1)).toBe(true)
  expect(gains[0].gain.value).toBe(0.6)
  engine.setLevel('rain', 0.8)
  expect(gains[1].gain.setTargetAtTime).toHaveBeenCalledWith(0.8 * 0.32, 0, 0.04)
  engine.setVolume(0.3)
  expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 0, 0.04)
  engine.dispose()
  expect(close).toHaveBeenCalledOnce()
})
