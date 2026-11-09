import { describe, expect, it } from 'vitest'
import { filterTools, tools } from './catalog'

describe('filterTools', () => {
  it('matches a keyword without case sensitivity or surrounding spaces', () => {
    expect(filterTools(tools, '  JSON  ', '全部').map((tool) => tool.id)).toEqual(['json-beautifier'])
  })

  it('combines a category with the search query', () => {
    expect(filterTools(tools, '转换', '效率').map((tool) => tool.id)).toEqual(['timestamp'])
    expect(filterTools(tools, 'JSON', '文本')).toEqual([])
  })

  it('returns the catalog for an empty query and all category', () => {
    expect(filterTools(tools, ' ', '全部')).toEqual(tools)
  })
})
