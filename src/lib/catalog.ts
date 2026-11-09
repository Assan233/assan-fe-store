export type ToolCategory = '效率' | '文本' | '开发' | '音频'
export type Tool = {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string
  accent: 'violet' | 'mint' | 'amber'
  keywords: string[]
  path?: string
}

export const tools: Tool[] = [
  {
    id: 'm4a-to-flac',
    name: 'M4A 转 FLAC',
    description: '浏览器本地转换音频，文件无需上传。',
    category: '音频',
    icon: '♫',
    accent: 'mint',
    keywords: ['m4a', 'flac', '音频', '转换', '音乐'],
    path: '/tools/m4a-to-flac',
  },
  {
    id: 'json-beautifier',
    name: 'JSON 格式化',
    description: '整理缩进、快速阅读 JSON 数据结构。',
    category: '开发',
    icon: '{ }',
    accent: 'violet',
    keywords: ['json', '格式化', '开发', 'format'],
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: '在 Unix 时间戳与常用日期格式间转换。',
    category: '效率',
    icon: '◷',
    accent: 'mint',
    keywords: ['时间', '日期', 'timestamp', '效率'],
  },
  {
    id: 'text-diff',
    name: '文本比较',
    description: '并排查看两段文本之间的差异。',
    category: '文本',
    icon: '≠',
    accent: 'amber',
    keywords: ['文本', '比较', 'diff', '差异'],
  },
]

export type CategoryFilter = '全部' | ToolCategory

export function filterTools(items: Tool[], query: string, category: CategoryFilter) {
  const normalized = query.trim().toLocaleLowerCase()
  return items.filter((tool) => {
    const matchesCategory = category === '全部' || tool.category === category
    const searchable = [tool.name, tool.description, tool.category, ...tool.keywords]
      .join(' ')
      .toLocaleLowerCase()
    return matchesCategory && (!normalized || searchable.includes(normalized))
  })
}
