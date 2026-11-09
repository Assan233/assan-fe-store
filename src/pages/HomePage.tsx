import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, WandSparkles } from 'lucide-react'
import { filterTools, tools, type CategoryFilter, type Tool } from '../lib/catalog'

const categories: CategoryFilter[] = ['全部', '效率', '文本', '开发']

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article className="tool-card">
      <div className="tool-card-top">
        <div className={`tool-icon ${tool.accent}`} aria-hidden="true">{tool.icon}</div>
        <span className="status-pill"><span />筹备中</span>
      </div>
      <div className="tool-card-copy">
        <div className="tool-title-row"><h3>{tool.name}</h3><span className="card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span></div>
        <p>{tool.description}</p>
      </div>
      <div className="tool-card-bottom"><span className="category-tag">{tool.category}</span><span className="preview-label">功能预览</span></div>
    </article>
  )
}

export function HomePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('全部')
  const visibleTools = useMemo(() => filterTools(tools, query, category), [query, category])

  return (
    <>
      <section className="hero-card" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> PERSONAL TOOLKIT <span className="eyebrow-line" /></div>
          <h1 id="welcome-title">好用的小工具，<br /><span>都在这里。</span></h1>
          <p>日常遇到的小问题，打开应用库，<br className="desktop-break" />总有一个轻巧的办法。</p>
          <a className="hero-link" href="#all-tools">浏览全部应用 <span>↓</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="hero-spark spark-one">✳</div><div className="hero-spark spark-two">✦</div>
          <div className="hero-tile tile-back"><span>01</span><i>✧</i></div>
          <div className="hero-tile tile-front"><div className="tile-window"><span /><span /><span /></div><div className="tile-glyph">✳</div><div className="tile-lines"><i /><i /><i /></div></div>
          <div className="floating-chip"><WandSparkles size={15} /><span>简单一点</span></div>
          <span className="art-caption">A LITTLE MORE<br />FLOW, EVERY DAY</span>
        </div>
        <div className="hero-index">01 <span>/</span> 03</div>
      </section>

      <section className="catalog-section" id="all-tools" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div><div className="section-kicker">YOUR TOOLBOX</div><h2 id="catalog-title">应用总览 <span className="count-bubble">{tools.length.toString().padStart(2, '0')}</span></h2></div>
          <label className="search-box"><Search size={17} aria-hidden="true" /><span className="sr-only">搜索应用</span><input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="搜索一个工具…" /></label>
        </div>

        <div className="catalog-controls">
          <div className="category-tabs" role="group" aria-label="按分类筛选">
            {categories.map((item) => <button key={item} className={`category-tab${category === item ? ' selected' : ''}`} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <span className="result-count">{visibleTools.length} 个应用</span>
        </div>

        {visibleTools.length > 0 ? (
          <div className="tool-grid">{visibleTools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>
        ) : (
          <div className="empty-state"><div className="empty-icon"><Search size={19} /></div><strong>没有找到匹配的应用</strong><p>试试其他关键词，或切换一个分类。</p><button type="button" onClick={() => { setQuery(''); setCategory('全部') }}>清除筛选</button></div>
        )}

        <div className="catalog-footnote"><span className="footnote-spark">✳</span><span>更多小工具正在慢慢整理中</span><span className="footnote-rule" /></div>
      </section>
    </>
  )
}
