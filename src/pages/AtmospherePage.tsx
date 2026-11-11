import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CloudRain, Flame, Music2, Pause, Play, Volume2, Waves, Wind } from 'lucide-react'
import { createAtmosphereEngine, soundIds, type AtmosphereEngine, type SoundId, type SoundLevels } from '../features/atmosphere/sound'
import './atmosphere.css'

const presets: { name: string; description: string; levels: SoundLevels }[] = [
  { name: '雨夜巡航', description: '雨声作底，伴一点轻风。', levels: { rain: 0.65, wind: 0.25, fire: 0, noise: 0 } },
  { name: '露营夜晚', description: '篝火轻响，风从远处吹来。', levels: { rain: 0, wind: 0.22, fire: 0.7, noise: 0 } },
  { name: '安静片刻', description: '用柔和的底噪填满空白。', levels: { rain: 0, wind: 0, fire: 0, noise: 0.38 } },
]

const sounds = [
  { id: 'rain', name: '细雨', icon: CloudRain, description: '落在车窗上的雨点' },
  { id: 'wind', name: '微风', icon: Wind, description: '低沉、舒缓的风声' },
  { id: 'fire', name: '篝火', icon: Flame, description: '轻微的噼啪声' },
  { id: 'noise', name: '白噪音', icon: Waves, description: '均匀的背景声' },
] as const

/** Mixes locally generated ambience with an optional, device-local music file. */
export default function AtmospherePage() {
  const [levels, setLevels] = useState<SoundLevels>({ ...presets[0].levels })
  const [volume, setVolume] = useState(0.55)
  const [playing, setPlaying] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [music, setMusic] = useState<{ name: string; url: string } | null>(null)
  const engine = useRef<AtmosphereEngine | null>(null)
  const revision = useRef(0)
  const musicURL = useRef('')
  const player = useRef<HTMLAudioElement>(null)
  const activePreset = presets.find((preset) => soundIds.every((id) => preset.levels[id] === levels[id]))?.name

  useEffect(() => () => {
    revision.current += 1
    engine.current?.dispose()
    if (musicURL.current) URL.revokeObjectURL(musicURL.current)
  }, [])

  async function start() {
    if (engine.current || starting) return
    const request = ++revision.current
    setStarting(true)
    setError('')
    try {
      const created = await createAtmosphereEngine(levels, volume)
      if (revision.current !== request) { created.dispose(); return }
      engine.current = created
      setPlaying(true)
    } catch {
      if (revision.current === request) setError('声音未能启动，请检查浏览器的音频权限后重试。')
    } finally {
      if (revision.current === request) setStarting(false)
    }
  }

  function stop() {
    revision.current += 1
    engine.current?.dispose()
    engine.current = null
    player.current?.pause()
    setPlaying(false)
    setStarting(false)
  }

  function changeLevel(id: SoundId, level: number) {
    setLevels((current) => ({ ...current, [id]: level }))
    engine.current?.setLevel(id, level)
  }

  function choosePreset(preset: (typeof presets)[number]) {
    setLevels({ ...preset.levels })
    soundIds.forEach((id) => engine.current?.setLevel(id, preset.levels[id]))
  }

  function chooseMusic(file?: File) {
    player.current?.pause()
    if (musicURL.current) URL.revokeObjectURL(musicURL.current)
    musicURL.current = ''
    if (!file) { setMusic(null); return }
    const url = URL.createObjectURL(file)
    musicURL.current = url
    setMusic({ name: file.name, url })
  }

  return (
    <div className="atmosphere-page">
      <Link to="/" className="atmosphere-back">← 返回应用库</Link>
      <header className="atmosphere-hero">
        <span className="atmosphere-kicker">让旅途有自己的声音</span>
        <h1>车内氛围生成器</h1>
        <p>选一个心情，或自己调出喜欢的雨声、微风与篝火。所有声音都在浏览器里生成。</p>
        <div className="atmosphere-player">
          <button className="atmosphere-play" type="button" onClick={playing ? stop : start} disabled={starting} aria-label={playing ? '停止氛围音和背景音乐' : '播放氛围音'}>
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <div className="atmosphere-playing-copy"><strong>{starting ? '正在准备声音…' : playing ? '氛围正在播放' : '准备好，按下播放'}</strong><span>{activePreset ?? '我的专属混音'}</span></div>
          <span className={`atmosphere-indicator${playing ? ' is-playing' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
        {error && <p className="atmosphere-error" role="alert">{error}</p>}
      </header>

      <section className="atmosphere-section" aria-labelledby="atmosphere-scenes">
        <div className="atmosphere-heading"><h2 id="atmosphere-scenes">挑选一个场景</h2><span>也可以从零开始调节</span></div>
        <div className="atmosphere-presets">
          {presets.map((preset, index) => <button type="button" key={preset.name} className={`atmosphere-preset${activePreset === preset.name ? ' active' : ''}`} aria-pressed={activePreset === preset.name} onClick={() => choosePreset(preset)}><span className="atmosphere-preset-symbol" aria-hidden="true">{['☂', '✳', '◌'][index]}</span><strong>{preset.name}</strong><small>{preset.description}</small></button>)}
        </div>
      </section>

      <section className="atmosphere-section" aria-labelledby="atmosphere-mixer">
        <div className="atmosphere-heading"><h2 id="atmosphere-mixer">调一调你的声音</h2><span>滑动即可实时混音</span></div>
        <div className="atmosphere-mixer">
          {sounds.map(({ id, name, icon: Icon, description }) => <div className="atmosphere-track" key={id}>
            <span className="atmosphere-track-icon"><Icon size={21} aria-hidden="true" /></span>
            <div className="atmosphere-track-copy"><label htmlFor={`atmosphere-${id}`}>{name}</label><small>{description}</small></div>
            <input id={`atmosphere-${id}`} type="range" min="0" max="100" value={Math.round(levels[id] * 100)} onChange={(event) => changeLevel(id, Number(event.currentTarget.value) / 100)} aria-valuetext={`${Math.round(levels[id] * 100)}%`} />
            <output htmlFor={`atmosphere-${id}`}>{Math.round(levels[id] * 100)}%</output>
          </div>)}
          <div className="atmosphere-track atmosphere-master"><span className="atmosphere-track-icon"><Volume2 size={21} aria-hidden="true" /></span><div className="atmosphere-track-copy"><label htmlFor="atmosphere-volume">环境音总音量</label><small>不影响本机背景音乐</small></div><input id="atmosphere-volume" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => { const next = Number(event.currentTarget.value) / 100; setVolume(next); engine.current?.setVolume(next) }} aria-valuetext={`${Math.round(volume * 100)}%`} /><output htmlFor="atmosphere-volume">{Math.round(volume * 100)}%</output></div>
        </div>
      </section>

      <section className="atmosphere-section atmosphere-music" aria-labelledby="atmosphere-music-title">
        <div className="atmosphere-heading"><h2 id="atmosphere-music-title"><Music2 size={21} aria-hidden="true" /> 加一点背景音乐</h2><span>可选 · 从设备选择</span></div>
        <p>选择设备上的音频文件，与氛围音同时播放。音乐由下方播放器单独控制，不会上传到服务器。</p>
        <label className="atmosphere-file" htmlFor="atmosphere-file">{music ? `更换音乐：${music.name}` : '选择本机音乐文件'}</label>
        <input id="atmosphere-file" className="sr-only" type="file" accept="audio/*" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) chooseMusic(file); event.currentTarget.value = '' }} />
        {music && <div className="atmosphere-music-controls"><audio ref={player} src={music.url} controls preload="none" aria-label={`背景音乐：${music.name}`} /><button type="button" onClick={() => chooseMusic()}>移除音乐</button></div>}
      </section>
      <p className="atmosphere-note">停车时调节音量和场景；行驶中请专注驾驶。关闭页面会停止播放。</p>
    </div>
  )
}
