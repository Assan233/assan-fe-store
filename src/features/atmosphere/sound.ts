export const soundIds = ['rain', 'wind', 'fire', 'noise'] as const
export type SoundId = (typeof soundIds)[number]
export type SoundLevels = Record<SoundId, number>

function makeBuffer(context: AudioContext, id: SoundId): AudioBuffer {
  const length = context.sampleRate * 12
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let seed = { rain: 11, wind: 23, fire: 37, noise: 53 }[id]
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  if (id === 'fire') {
    for (let i = 0; i < length; i += 1) {
      if (random() < 0.0007) {
        const duration = Math.min(0.035 * context.sampleRate, length - i)
        const strength = 0.2 + random() * 0.8
        for (let j = 0; j < duration; j += 1) {
          samples[i + j] += (random() * 2 - 1) * strength * Math.exp(-j / (context.sampleRate * 0.005))
        }
      }
      samples[i] += (random() * 2 - 1) * 0.075
    }
  } else {
    for (let i = 0; i < length; i += 1) samples[i] = random() * 2 - 1
  }
  return buffer
}

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
      filter.type = id === 'rain' ? 'highpass' : 'lowpass'
      filter.frequency.value = { rain: 550, wind: 320, fire: 1500, noise: 4800 }[id]
      const gain = context.createGain()
      gain.gain.value = levels[id] * (id === 'wind' ? 0.75 : id === 'fire' ? 1.5 : 0.32)
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
      gains[id].gain.setTargetAtTime(level * (id === 'wind' ? 0.75 : id === 'fire' ? 1.5 : 0.32), context.currentTime, 0.04)
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
