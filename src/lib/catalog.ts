export type ToolCategory = '效率' | '文本' | '开发' | '音频' | '游戏'
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
    id: 'tower-defense',
    name: '荒漠塔防',
    description: '在荒原布置四种防御塔，守住八波魔物进攻。',
    category: '游戏',
    icon: '✦',
    accent: 'violet',
    keywords: ['塔防', '游戏', '策略', '防御', '荒漠'],
    path: '/tools/tower-defense',
  },
  {
    id: 'atmosphere',
    name: '车内氛围生成器',
    description: '混合雨声、微风与篝火，给旅途配上自己的声音。',
    category: '音频',
    icon: '◉',
    accent: 'amber',
    keywords: ['氛围', '车内', '白噪音', '雨声', '露营', '音乐'],
    path: '/tools/atmosphere',
  },
  {
    id: 'music',
    name: '飞牛音乐',
    description: '在应用库内全屏播放你的飞牛音乐。',
    category: '音频',
    icon: '♪',
    accent: 'violet',
    keywords: ['音乐', '飞牛', '播放', 'music'],
    path: '/tools/music',
  },
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
