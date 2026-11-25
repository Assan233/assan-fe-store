import { Link } from 'react-router-dom'
import { HardDrive } from 'lucide-react'
import { NasMediaForm } from '../features/nas/NasMediaForm'
import './audio-converter.css'

export default function AudioTitlePage() {
  return <section className="audio-converter" aria-labelledby="audio-title">
    <Link to="/" className="hero-link">← 返回应用库</Link>
    <div className="section-kicker">NAS AUDIO TOOL</div>
    <h1 id="audio-title">按文件名设置歌曲标题</h1>
    <p>将文件名去掉扩展名后写入音频内嵌的歌曲标题。例如「晴天.flac」会写入标题「晴天」，文件名不会更改。支持多选 NAS 文件或文件夹，并处理子文件夹中的音频。</p>
    <div className="nas-workspace">
      <div className="nas-workspace-heading">
        <span className="nas-icon-chip"><HardDrive size={22} aria-hidden="true" /></span>
        <span><strong>NAS 音频</strong><small>支持 MP3、FLAC、M4A、Ogg、Opus、WMA 和 APE。</small></span>
      </div>
      <NasMediaForm mode="title" />
    </div>
  </section>
}
