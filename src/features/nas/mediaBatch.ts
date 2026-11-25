import { api, type NasKind } from '../../lib/api'

export type NasSelection = { path: string; directory: boolean }
export type NasBatchFailure = { path: string; message: string }

/** Joins a NAS directory and entry name into a root-relative path. */
export function nasChildPath(parent: string, name: string) {
  return parent === '.' ? name : `${parent}/${name}`
}

/** Expands selected folders recursively, collecting each supported media file only once. */
export async function collectNasFiles(selections: NasSelection[], kind: Exclude<NasKind, 'folder'>, signal: AbortSignal) {
  const pending = [...selections].reverse()
  const visited = new Set<string>()
  const files: string[] = []
  const failures: NasBatchFailure[] = []
  while (pending.length) {
    signal.throwIfAborted()
    const { path, directory } = pending.pop()!
    if (visited.has(path)) continue
    visited.add(path)
    if (!directory) {
      files.push(path)
      continue
    }
    try {
      const entries = await api.nasEntries(path, kind, signal)
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index]
        pending.push({ path: nasChildPath(path, entry.name), directory: entry.directory })
      }
    } catch (cause) {
      signal.throwIfAborted()
      failures.push({ path, message: cause instanceof Error ? cause.message : '无法读取 NAS 目录。' })
    }
  }
  return { files, failures }
}
