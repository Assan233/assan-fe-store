import { describe, expect, it } from 'vitest'
import { compareLines, formatJson, localDateToTimestamp, timestampToDate } from './communityTools'

describe('社区工具本地转换', () => {
  it('格式化 JSON 原始值并拒绝非法输入', () => {
    expect(formatJson('{"a":1}', 2)).toBe('{\n  "a": 1\n}')
    expect(formatJson('false', 0)).toBe('false')
    expect(() => formatJson('{broken}', 2)).toThrow()
  })

  it('辨别秒和毫秒、负数及越界时间戳', () => {
    expect(timestampToDate('0', 'seconds')?.toISOString()).toBe('1970-01-01T00:00:00.000Z')
    expect(timestampToDate('-1', 'seconds')?.getTime()).toBe(-1000)
    expect(timestampToDate('1000', 'milliseconds')?.getTime()).toBe(1000)
    expect(timestampToDate('1.2', 'seconds')).toBeNull()
    expect(timestampToDate('999999999999999999999', 'milliseconds')).toBeNull()
  })

  it('验证本地日期，不自动归一化不存在的日期', () => {
    expect(localDateToTimestamp('2024-02-29T12:00')).not.toBeNull()
    expect(localDateToTimestamp('2023-02-29T12:00')).toBeNull()
    expect(localDateToTimestamp('2024-02-29T25:00')).toBeNull()
  })

  it('比较插入、删除、修改和相同的行', () => {
    expect(compareLines('a\nb\nc', 'a\nx\nc\nd')).toEqual([
      { left: 'a', right: 'a', kind: 'same' },
      { left: 'b', right: 'x', kind: 'change' },
      { left: 'c', right: 'c', kind: 'same' },
      { left: null, right: 'd', kind: 'added' },
    ])
    expect(compareLines('a\nb', 'a')).toEqual([
      { left: 'a', right: 'a', kind: 'same' },
      { left: 'b', right: null, kind: 'removed' },
    ])
    expect(compareLines('a\n'.repeat(300), '')).toBeNull()
  })
})
