import { FFmpeg } from '@ffmpeg/ffmpeg'
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

const maxBytes = 100 * 1024 * 1024

/** Validates the selected input before loading the conversion engine. */
export function validateAudio(file: File): string | undefined {
  if (!/\.m4a$/i.test(file.name)) return '请选择 .m4a 格式的音频文件。'
  if (file.size === 0) return '文件为空，请重新选择。'
  if (file.size > maxBytes) return '文件超过 100 MiB，请选择更小的文件。'
}

/** Converts one local file in a disposable worker; aborting releases its memory. */
export async function convertToFlac(
  file: File,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<Blob> {
  const error = validateAudio(file)
  if (error) throw new Error(error)
  signal.throwIfAborted()
  const engine = new FFmpeg()
  const abort = () => engine.terminate()
  signal.addEventListener('abort', abort, { once: true })
  try {
    onProgress('正在加载本地转换引擎（首次约 32 MB）…')
    await engine.load({ coreURL, wasmURL })
    signal.throwIfAborted()
    onProgress('正在读取音频…')
    const input = new Uint8Array(await file.arrayBuffer())
    signal.throwIfAborted()
    await engine.writeFile('input.m4a', input)
    engine.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) {
        onProgress(`正在转换…约 ${Math.min(99, Math.max(0, Math.round(progress * 100)))}%`)
      }
    })
    onProgress('正在转换…')
    const exitCode = await engine.exec([
      '-i', 'input.m4a', '-map', '0:a:0',
      // Include optional covers, excluding ordinary video streams.
      '-map', '0:v?', '-map', '-0:V?', '-map_metadata', '0',
      '-c:a', 'flac', '-c:v', 'copy', '-disposition:v', 'attached_pic',
      // M4A artwork has no picture role; FLAC players expect type 3 for album art.
      '-metadata:s:v:0', 'comment=Cover (front)', 'output.flac',
    ])
    if (exitCode !== 0) throw new Error('无法转换此文件，请确认它是未加密且未损坏的 M4A 音频。')
    const data = await engine.readFile('output.flac')
    signal.throwIfAborted()
    if (typeof data === 'string' || data.byteLength === 0) throw new Error('转换未生成有效音频。')
    return new Blob([new Uint8Array(data)], { type: 'audio/flac' })
  } finally {
    signal.removeEventListener('abort', abort)
    engine.terminate()
  }
}
