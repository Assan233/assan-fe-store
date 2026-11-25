import { Link } from 'react-router-dom'
import { HardDrive } from 'lucide-react'
import { NasMediaForm } from '../features/nas/NasMediaForm'
import './audio-converter.css'

export default function AudioRenamePage() {
  return <section className="audio-converter" aria-labelledby="audio-title">
    <Link to="/" className="hero-link">← 返回应用库</Link>
    <div className="section-kicker">NAS AUDIO TOOL</div>
    <h1 id="audio-title">按歌曲名重命名</h1>
    <p>可多选 NAS 音频文件或文件夹，所选文件夹包含所有子文件夹。工具读取内嵌歌曲标题，在原目录更新文件名并保留扩展名；缺少标题或目标文件已存在时会跳过该文件。</p>
    <div className="nas-workspace">
      <div className="nas-workspace-heading">
        <span className="nas-icon-chip"><HardDrive size={22} aria-hidden="true" /></span>
        <span><strong>NAS 音频</strong><small>支持 MP3、FLAC、M4A、AAC、WAV、Ogg、Opus、WMA、AIFF 和 APE。</small></span>
      </div>
      <NasMediaForm mode="rename" />
    </div>
  </section>
}
