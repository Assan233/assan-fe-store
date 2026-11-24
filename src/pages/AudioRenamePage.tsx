import { Link } from 'react-router-dom'
import { NasMediaForm } from '../features/nas/NasMediaForm'

export default function AudioRenamePage() {
  return <section className="audio-converter" aria-labelledby="audio-title">
    <Link to="/" className="hero-link">← 返回应用库</Link>
    <div className="section-kicker">NAS AUDIO TOOL</div>
    <h1 id="audio-title">按歌曲名重命名</h1>
    <p>读取音频内嵌的歌曲标题，在 NAS 原目录内更新文件名，并保留扩展名。缺少标题或目标文件已存在时，不会改动原文件。</p>
    <div className="audio-panel">
      <p>支持 MP3、FLAC、M4A、AAC、WAV、Ogg、Opus、WMA、AIFF 和 APE（文件须包含歌曲标题）。</p>
      <NasMediaForm mode="rename" />
    </div>
  </section>
}
