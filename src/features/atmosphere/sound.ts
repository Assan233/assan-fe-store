export const soundIds = ['rain', 'wind', 'fire', 'noise'] as const
export type SoundId = (typeof soundIds)[number]
export type SoundLevels = Record<SoundId, number>

function makeBuffer(context: AudioContext, id: SoundId): AudioBuffer {
  const rate = context.sampleRate
  const length = rate * 16
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let seed = { rain: 11, wind: 23, fire: 37, noise: 53 }[id]
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  let low = 0
  let mid = 0
  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1
    low += (white - low) * 0.003
    mid += (white - mid) * 0.08
    const seconds = i / rate

    if (id === 'rain') {
      // Soft, broad rainfall underneath scattered drops of varying intensity.
      samples[i] += white * 0.08 + mid * 0.42 + low * 0.3
      if (random() < 65 / rate) {
        const duration = Math.min(Math.ceil(rate * (0.008 + random() * 0.025)), length - i)
        const strength = 0.13 + random() * 0.28
        for (let j = 0; j < duration; j += 1) {
          samples[i + j] += (random() * 2 - 1) * strength * Math.exp(-j / (rate * 0.005))
        }
      }
    } else if (id === 'wind') {
      const swell = 0.55 + 0.22 * Math.sin(seconds * 0.67) + 0.16 * Math.sin(seconds * 1.13)
      samples[i] += (low * 4.5 + mid * 0.32) * swell
    } else if (id === 'fire') {
      samples[i] += low * 1.5 + mid * 0.24
      if (random() < 14 / rate) {
        const duration = Math.min(Math.ceil(rate * (0.012 + random() * 0.028)), length - i)
        const strength = 0.35 + random() * 0.55
        for (let j = 0; j < duration; j += 1) {
          samples[i + j] += (random() * 2 - 1) * strength * Math.exp(-j / (rate * 0.004))
        }
      }
    } else {
      samples[i] += white * 0.24
    }
  }

  // Fade both endpoints to zero so each loop joins without a sudden jump.
  const fadeLength = Math.min(Math.floor(rate * 0.08), Math.floor(length / 4))
  for (let i = 0; i < fadeLength; i += 1) {
    const fade = i / fadeLength
    samples[i] *= fade
    samples[length - 1 - i] *= fade
  }
  return buffer
}

const soundGains: Record<SoundId, number> = { rain: 0.48, wind: 0.54, fire: 0.7, noise: 0.32 }

/** Creates browser-local looping ambience; dispose releases the audio device and sources. */
export async function createAtmosphereEngine(levels: SoundLevels, volume: number) {
  const context = new AudioContext()
  const master = context.createGain()
  master.gain.value = volume
  master.connect(context.destination)
  const gains = {} as Record<SoundId, GainNode>

  try {
    for (const id of soundIds) {
      const source = context.createBufferSource()
      source.buffer = makeBuffer(context, id)
      source.loop = true
      const filter = context.createBiquadFilter()
       filter.type = 'lowpass'
       filter.frequency.value = { rain: 4500, wind: 650, fire: 2400, noise: 8500 }[id]
       const gain = context.createGain()
       gain.gain.value = levels[id] * soundGains[id]
      gains[id] = gain
      source.connect(filter).connect(gain).connect(master)
      source.start()
    }
    await context.resume()
  } catch (error) {
    await context.close()
    throw error
  }

  return {
    setLevel(id: SoundId, level: number) {
       gains[id].gain.setTargetAtTime(level * soundGains[id], context.currentTime, 0.04)
    },
    setVolume(level: number) {
      master.gain.setTargetAtTime(level, context.currentTime, 0.04)
    },
    dispose() {
      if (context.state !== 'closed') void context.close()
    },
  }
}

export type AtmosphereEngine = Awaited<ReturnType<typeof createAtmosphereEngine>>
