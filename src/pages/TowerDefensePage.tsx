import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, CircleDollarSign, FastForward, Heart, Pause, Play, RotateCcw, Shield, Target, VolumeX } from 'lucide-react'
import { buildTower, columns, enemySpecs, lastWave, newGame, onPath, rows, sellTower, startWave, tick, towerSpecs, upgradeCost, upgradeTower, waveSize, type Game, type TowerKind } from '../features/tower-defense/game'
import { EnemySprite, TowerSprite } from '../features/tower-defense/sprites'
import './tower-defense.css'

const kinds: TowerKind[] = ['arrow', 'frost', 'cannon', 'beam']
/** Interactive, self-contained tower-defense game; the simulation pauses when this page unmounts. */
export default function TowerDefensePage() {
  const [game, setGame] = useState<Game>(newGame)
  const [building, setBuilding] = useState<TowerKind | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const selected = game.towers.find((tower) => tower.id === selectedId)
  const arenaHost = useRef<HTMLDivElement>(null)
  const arenaController = useRef<Awaited<ReturnType<typeof import('../features/tower-defense/arena').mountArena>> | null>(null)
  const latest = useRef({ game, selectedId, paused, speed })

  useEffect(() => {
    let disposed = false
    const host = arenaHost.current
    if (host) void import('../features/tower-defense/arena').then(({ mountArena }) => {
      if (disposed) return
      const controller = mountArena(host)
      arenaController.current = controller
      const state = latest.current
       controller.sync(state.game, state.selectedId, state.paused, state.speed)
    })
    return () => { disposed = true; arenaController.current?.destroy(); arenaController.current = null }
  }, [])

  useEffect(() => {
    latest.current = { game, selectedId, paused, speed }
    arenaController.current?.sync(game, selectedId, paused, speed)
  }, [game, selectedId, paused, speed])

  useEffect(() => {
    if (game.phase !== 'running' || paused) return
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = Math.min((now - previous) / 1000, 0.1)
      previous = now
      setGame((current) => tick(current, elapsed * speed))
    }, 50)
    return () => window.clearInterval(timer)
  }, [game.phase, paused, speed])

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  function clickCell(x: number, y: number) {
    const tower = game.towers.find((item) => item.x === x && item.y === y)
    if (tower) { setSelectedId(tower.id); setBuilding(null); return }
    if (!building) return
    setGame((current) => buildTower(current, building, x, y))
    setSelectedId(null)
  }

  function restart() {
    setGame(newGame())
    setBuilding(null)
    setSelectedId(null)
    setPaused(false)
    setSpeed(1)
  }

  return (
    <main className="td-page">
      <Link className="td-back" to="/">← 返回应用库</Link>
      <header className="td-header">
        <div><span className="td-eyebrow">策略游戏 · 荒原前哨</span><h1>荒漠塔防<span aria-hidden="true"> ✦</span></h1><p>在荒原布置防御塔，阻止沿沙路逼近的魔物。守住八波进攻，别让它们抵达右侧城堡。</p></div>
        <button type="button" className="td-reset" onClick={restart}><RotateCcw size={17} aria-hidden="true" /> 重新开始</button>
      </header>

      <div className="td-stats" aria-label="战况">
        <div className="td-stat"><span><Heart size={17} aria-hidden="true" /> 城堡生命</span><strong>{game.lives}</strong></div>
        <div className="td-stat"><span><CircleDollarSign size={17} aria-hidden="true" /> 金币</span><strong>{game.gold}</strong></div>
        <div className="td-stat"><span><Shield size={17} aria-hidden="true" /> 当前波次</span><strong>{game.wave} <small>/ {lastWave}</small></strong></div>
        <div className="td-stat"><span><Target size={17} aria-hidden="true" /> 积分</span><strong>{game.score}</strong></div>
      </div>

      <div className="td-layout">
        <section className="td-arena" aria-label="塔防战场">
          <div className="td-arena-top"><span className="td-arena-dot" /> 荒原之路 <span className="td-arena-tip">{building ? `正在建造${towerSpecs[building].name} · 点击空地放置` : '点击防御塔可升级或出售 · 手机可左右滑动战场'}</span></div>
           <div className="td-board-scroll">
             <div className={`td-board${building ? ' is-building' : ''}${paused ? ' is-paused' : ''}`}>
               <div className="td-phaser" ref={arenaHost} aria-hidden="true" />
              <span className="td-gate td-gate-start" aria-hidden="true">入口</span><span className="td-gate td-gate-end" aria-hidden="true">城堡</span>
              <div className="td-cells">
                {Array.from({ length: rows * columns }, (_, index) => {
                  const x = index % columns
                  const y = Math.floor(index / columns)
                  const road = onPath(x, y)
                  const tower = game.towers.find((item) => item.x === x && item.y === y)
                  const unavailable = game.phase === 'lost' || game.phase === 'won'
                  return <button key={index} type="button" disabled={road || unavailable || (!tower && (!building || game.gold < towerSpecs[building].cost))} className={`td-cell${tower ? ' has-tower' : ''}${selectedId === tower?.id ? ' selected' : ''}${building && !tower && !road && game.gold >= towerSpecs[building].cost ? ' can-build' : ''}`} aria-label={tower ? `${x + 1} 列 ${y + 1} 行：${towerSpecs[tower.kind].name}，${tower.level} 级` : `${x + 1} 列 ${y + 1} 行${road ? '，通道' : '，空地'}`} onClick={() => clickCell(x, y)} />
                })}
              </div>
              <span className="td-sr-only" role="status" aria-live="off">场上敌人 {game.enemies.length}，已建防御塔 {game.towers.length}</span>
              {(game.phase === 'won' || game.phase === 'lost' || paused) && <div className="td-board-overlay" role="status"><strong>{game.phase === 'won' ? '城堡守住了！' : game.phase === 'lost' ? '城堡失守' : '已暂停'}</strong><span>{game.phase === 'won' ? `最终得分 ${game.score} · 再来一次？` : game.phase === 'lost' ? '调整防线，再挑战一次。' : '点击继续，重返战场。'}</span><button type="button" onClick={game.phase === 'running' ? () => setPaused(false) : restart}>{game.phase === 'running' ? '继续游戏' : '重新挑战'}</button></div>}
            </div>
          </div>
           <div className="td-controls"><span>{game.phase === 'ready' ? `第 ${game.wave} 波已就绪 · ${waveSize(game.wave)} 名敌人` : game.phase === 'running' ? `第 ${game.wave} 波 · 已出现 ${game.spawned}/${waveSize(game.wave)} · 场上 ${game.enemies.length}` : game.phase === 'won' ? '胜利！八波防线全部守住' : '失败 · 城堡已失守'}</span><div><button type="button" disabled={game.phase !== 'running'} onClick={() => setPaused((value) => !value)} aria-label={paused ? '继续游戏' : '暂停游戏'}>{paused ? <Play size={17} /> : <Pause size={17} />}</button><button type="button" disabled={game.phase !== 'running'} onClick={() => setSpeed((value) => value === 1 ? 2 : 1)} aria-label={`游戏速度 ${speed} 倍，点击切换`}><FastForward size={17} /> {speed}×</button><button type="button" className="td-wave-button" disabled={game.phase !== 'ready'} onClick={() => { setPaused(false); setGame(startWave) }}><Play size={16} fill="currentColor" /> 开始第 {game.wave} 波</button></div></div>
        </section>

        <aside className="td-sidebar" aria-label="防御塔与说明">
           <section className="td-panel"><div className="td-panel-heading"><h2>建造防御塔</h2><span>选择后点击地图空地</span></div><div className="td-tower-list">{kinds.map((kind) => { const spec = towerSpecs[kind]; return <button key={kind} type="button" className={`td-shop-item td-shop-${kind}${building === kind ? ' active' : ''}`} aria-pressed={building === kind} disabled={game.gold < spec.cost || game.phase === 'won' || game.phase === 'lost'} onClick={() => { setBuilding(building === kind ? null : kind); setSelectedId(null) }}><span className="td-shop-icon"><TowerSprite kind={kind} /></span><span className="td-shop-copy"><strong>{spec.name}</strong><small>{spec.description}</small></span><b>{spec.cost} <small>金币</small></b></button> })}</div></section>
          <section className="td-panel td-detail"><div className="td-panel-heading"><h2>防御塔详情</h2><span>最高可升至 3 级</span></div>{selected ? <><div className="td-selected-title"><strong>{towerSpecs[selected.kind].name}</strong><span>LV.{selected.level}</span></div><p>伤害 {Math.round(towerSpecs[selected.kind].damage * (1 + (selected.level - 1) * .75))} · 射程 {(towerSpecs[selected.kind].range + (selected.level - 1) * .22).toFixed(1)} 格</p><div className="td-detail-actions"><button type="button" disabled={selected.level >= 3 || game.gold < upgradeCost(selected) || game.phase === 'won' || game.phase === 'lost'} onClick={() => setGame((current) => upgradeTower(current, selected.id))}><ArrowUp size={16} /> {selected.level >= 3 ? '已满级' : `升级 · ${upgradeCost(selected)}`}</button><button type="button" disabled={game.phase === 'won' || game.phase === 'lost'} onClick={() => { setGame((current) => sellTower(current, selected.id)); setSelectedId(null) }}>出售 · {Math.round(selected.spent * .65)}</button></div></> : <p className="td-hint">点击地图上的防御塔，查看属性并升级或出售。</p>}</section>
            <section className="td-panel td-guide"><h2>敌方魔物</h2><div className="td-enemy-guide">{(['runner', 'swarm', 'guard', 'boss'] as const).map((kind) => <div key={kind}><EnemySprite kind={kind} /><span><strong>{enemySpecs[kind].name}</strong><small>{kind === 'runner' ? '常规突袭' : kind === 'swarm' ? '快速穿行' : kind === 'guard' ? '重甲防御' : '每 4 波出现'}</small></span></div>)}</div><div><VolumeX size={16} aria-hidden="true" /> 本游戏静音，可随时暂停；离开页面自动停止。</div></section>
        </aside>
      </div>
    </main>
  )
}
