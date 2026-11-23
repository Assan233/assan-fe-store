import { zip } from 'fflate'

/** Packs local audio without recompressing it, preserving extensions when deduplicating names. */
export async function archiveAudio(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = Object.create(null)
  for (const file of files) {
    const base = file.name.replace(/[\\/]/g, '_')
    const dot = base.lastIndexOf('.')
    const stem = dot > 0 ? base.slice(0, dot) : base
    const extension = dot > 0 ? base.slice(dot) : ''
    let name = base
    let suffix = 2
    while (Object.hasOwn(entries, name)) name = `${stem} (${suffix++})${extension}`
    entries[name] = new Uint8Array(await file.blob.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (error, data) => {
      if (error) reject(error)
      else resolve(new Blob([new Uint8Array(data)], { type: 'application/zip' }))
    })
  })
}
