import { zip } from 'fflate'

/** Packs local results without recompressing FLAC; duplicate names remain distinct. */
export async function archiveAudio(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, Uint8Array> = Object.create(null)
  for (const file of files) {
    const base = file.name.replace(/[\\/]/g, '_')
    let name = base
    let suffix = 2
    while (Object.hasOwn(entries, name)) name = `${base.replace(/\.flac$/i, '')} (${suffix++}).flac`
    entries[name] = new Uint8Array(await file.blob.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (error, data) => {
      if (error) reject(error)
      else resolve(new Blob([new Uint8Array(data)], { type: 'application/zip' }))
    })
  })
}
