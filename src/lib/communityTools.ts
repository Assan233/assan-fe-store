/** Formats valid JSON, preserving primitives such as null and false. */
export function formatJson(input: string, spaces: number): string {
  return JSON.stringify(JSON.parse(input), null, spaces)
}

/** Converts a Unix timestamp in whole seconds or milliseconds to a date. */
export function timestampToDate(input: string, unit: 'seconds' | 'milliseconds'): Date | null {
  if (!/^-?\d+$/.test(input.trim())) return null
  const value = Number(input.trim())
  if (!Number.isSafeInteger(value)) return null
  const date = new Date(unit === 'seconds' ? value * 1000 : value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Converts a valid local date-time field value to a Unix timestamp. */
export function localDateToTimestamp(input: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return null
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  const normalized = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  return normalized === input ? date.getTime() : null
}

export type DiffRow = { left: string | null; right: string | null; kind: 'same' | 'change' | 'added' | 'removed' }

/** Compares up to 300 lines on each side, aligning unchanged lines and edits. */
export function compareLines(left: string, right: string): DiffRow[] | null {
  const before = left ? left.split('\n') : []
  const after = right ? right.split('\n') : []
  if (before.length > 300 || after.length > 300) return null
  const scores = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1))
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      scores[i][j] = before[i] === after[j] ? scores[i + 1][j + 1] + 1 : Math.max(scores[i + 1][j], scores[i][j + 1])
    }
  }
  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      rows.push({ left: before[i++], right: after[j++], kind: 'same' })
    } else if (j < after.length && (i === before.length || scores[i][j + 1] > scores[i + 1][j])) {
      rows.push({ left: null, right: after[j++], kind: 'added' })
    } else {
      rows.push({ left: before[i++], right: null, kind: 'removed' })
    }
  }
  const aligned: DiffRow[] = []
  for (let index = 0; index < rows.length;) {
    if (rows[index].kind === 'same') { aligned.push(rows[index++]); continue }
    const removed: string[] = []
    const added: string[] = []
    while (index < rows.length && rows[index].kind !== 'same') {
      const row = rows[index++]
      if (row.left !== null) removed.push(row.left)
      if (row.right !== null) added.push(row.right)
    }
    for (let line = 0; line < Math.max(removed.length, added.length); line++) {
      aligned.push({ left: removed[line] ?? null, right: added[line] ?? null, kind: line < removed.length && line < added.length ? 'change' : line < removed.length ? 'removed' : 'added' })
    }
  }
  return aligned
}
