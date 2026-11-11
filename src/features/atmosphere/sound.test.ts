import { afterEach, expect, it, vi } from 'vitest'
import { createAtmosphereEngine } from './sound'

afterEach(() => vi.unstubAllGlobals())

it('starts four looping sounds, updates their levels, and closes the audio context', async () => {
  const sources: Array<{ loop: boolean; start: ReturnType<typeof vi.fn> }> = []
  const gains: Array<{ gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> } }> = []
  const buffers: Float32Array[] = []
  const close = vi.fn(async () => undefined)
  class FakeAudioContext {
    sampleRate = 2000
    currentTime = 0
    state = 'running'
    destination = {}
    createBuffer(_channels: number, length: number) {
      const samples = new Float32Array(length)
      buffers.push(samples)
      return { getChannelData: () => samples }
    }
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
  for (const samples of buffers) {
    expect(samples.length).toBe(32000)
    expect(Math.abs(samples[0] - samples[samples.length - 1])).toBeLessThan(0.000001)
  }
  expect(buffers[0]).not.toEqual(buffers[1])
  const fire = buffers[2]
  const firePeak = fire.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0)
  const fireAverage = fire.reduce((sum, sample) => sum + Math.abs(sample), 0) / fire.length
  expect(firePeak).toBeGreaterThan(fireAverage * 4)
  expect(gains[0].gain.value).toBe(0.6)
  engine.setLevel('rain', 0.8)
  expect(gains[1].gain.setTargetAtTime).toHaveBeenCalledWith(0.8 * 0.48, 0, 0.04)
  engine.setVolume(0.3)
  expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 0, 0.04)
  engine.dispose()
  expect(close).toHaveBeenCalledOnce()
})
