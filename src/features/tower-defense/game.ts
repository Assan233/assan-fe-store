export const columns = 12
export const rows = 8
export const lastWave = 8

export type Point = { x: number; y: number }
export type TowerKind = 'arrow' | 'frost' | 'cannon' | 'beam'
export type EnemyKind = 'runner' | 'swarm' | 'guard' | 'boss'
export type Phase = 'ready' | 'running' | 'won' | 'lost'

export const path: Point[] = [
  { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 1 }, { x: 5, y: 1 },
  { x: 5, y: 5 }, { x: 8, y: 5 }, { x: 8, y: 2 }, { x: 11, y: 2 },
]

export const towerSpecs: Record<TowerKind, { name: string; cost: number; damage: number; range: number; interval: number; description: string }> = {
  arrow: { name: '连弩塔', cost: 70, damage: 18, range: 2.25, interval: 0.48, description: '射速快，适合清理轻型敌人' },
  frost: { name: '霜冻塔', cost: 95, damage: 9, range: 2.15, interval: 0.8, description: '减速目标，为其他塔争取时间' },
  cannon: { name: '火炮塔', cost: 135, damage: 32, range: 2.45, interval: 1.35, description: '范围爆炸，专治成群敌人' },
  beam: { name: '光束塔', cost: 155, damage: 43, range: 2.55, interval: 1.1, description: '穿透护甲，优先打击精英' },
}

export const enemySpecs: Record<EnemyKind, { name: string; hp: number; speed: number; armor: number; reward: number; leak: number }> = {
  runner: { name: '疾行者', hp: 46, speed: 1.85, armor: 0, reward: 14, leak: 1 },
  swarm: { name: '虫群', hp: 32, speed: 2.4, armor: 0, reward: 11, leak: 1 },
  guard: { name: '装甲兽', hp: 115, speed: 1.05, armor: 6, reward: 26, leak: 2 },
  boss: { name: '巨像', hp: 440, speed: 0.72, armor: 9, reward: 90, leak: 4 },
}

export type Tower = { id: number; kind: TowerKind; x: number; y: number; level: number; cooldown: number; spent: number }
export type Enemy = { id: number; kind: EnemyKind; progress: number; hp: number; maxHp: number; slow: number; hit?: number }
export type Shot = { id: number; from: Point; to: Point; kind: TowerKind; remaining: number; duration: number }
export type Game = {
  phase: Phase
  wave: number
  lives: number
  gold: number
  score: number
  towers: Tower[]
  enemies: Enemy[]
  shots: Shot[]
  spawned: number
  spawnTimer: number
  nextId: number
}

/** Creates a fresh, unstarted eight-wave defense session. */
export function newGame(): Game {
  return { phase: 'ready', wave: 1, lives: 18, gold: 240, score: 0, towers: [], enemies: [], shots: [], spawned: 0, spawnTimer: 0, nextId: 1 }
}

export function onPath(x: number, y: number): boolean {
  return path.some((point, index) => {
    if (index === 0) return point.x === x && point.y === y
    const previous = path[index - 1]
    return point.x === previous.x
      ? point.x === x && y >= Math.min(point.y, previous.y) && y <= Math.max(point.y, previous.y)
      : point.y === y && x >= Math.min(point.x, previous.x) && x <= Math.max(point.x, previous.x)
  })
}

export const routeLength = path.slice(1).reduce((length, point, index) => length + Math.abs(point.x - path[index].x) + Math.abs(point.y - path[index].y), 0)

export function positionAt(progress: number): Point {
  let remaining = Math.max(0, progress)
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1]
    const to = path[index]
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
    if (remaining <= length) return { x: from.x + (to.x - from.x) * remaining / length, y: from.y + (to.y - from.y) * remaining / length }
    remaining -= length
  }
  return path[path.length - 1]
}

/** Purchases a tower on an empty cell; returns the original state for an invalid placement. */
export function buildTower(game: Game, kind: TowerKind, x: number, y: number): Game {
  const cost = towerSpecs[kind].cost
  if (game.phase === 'won' || game.phase === 'lost' || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= columns || y >= rows || onPath(x, y) || game.gold < cost || game.towers.some((tower) => tower.x === x && tower.y === y)) return game
  return { ...game, gold: game.gold - cost, nextId: game.nextId + 1, towers: [...game.towers, { id: game.nextId, kind, x, y, level: 1, cooldown: 0, spent: cost }] }
}

export function upgradeCost(tower: Tower): number {
  return Math.round(towerSpecs[tower.kind].cost * (0.65 + tower.level * 0.35))
}

/** Levels a purchased tower up to the third level, if funds permit. */
export function upgradeTower(game: Game, id: number): Game {
  const tower = game.towers.find((item) => item.id === id)
  if (!tower || tower.level >= 3 || game.gold < upgradeCost(tower) || game.phase === 'won' || game.phase === 'lost') return game
  const cost = upgradeCost(tower)
  return { ...game, gold: game.gold - cost, towers: game.towers.map((item) => item.id === id ? { ...item, level: item.level + 1, spent: item.spent + cost } : item) }
}

/** Removes a tower and refunds 65% of its total cost. */
export function sellTower(game: Game, id: number): Game {
  const tower = game.towers.find((item) => item.id === id)
  if (!tower || game.phase === 'won' || game.phase === 'lost') return game
  return { ...game, gold: game.gold + Math.round(tower.spent * 0.65), towers: game.towers.filter((item) => item.id !== id) }
}

/** Starts the next wave only when the battlefield is ready. */
export function startWave(game: Game): Game {
  return game.phase === 'ready' ? { ...game, phase: 'running', spawned: 0, spawnTimer: 0 } : game
}

export function waveSize(wave: number): number { return 7 + wave * 2 + (wave % 4 === 0 ? 1 : 0) }

export function waveEnemy(wave: number, index: number): EnemyKind {
  if (wave % 4 === 0 && index === waveSize(wave) - 1) return 'boss'
  if (wave >= 2 && index % 4 === 3) return 'guard'
  if (wave >= 3 && index % 3 === 1) return 'swarm'
  return 'runner'
}

function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y) }

/** Advances a running wave by a bounded time slice; the caller owns the animation clock. */
export function tick(game: Game, dt: number): Game {
  if (game.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return game
  const elapsed = Math.min(dt, 0.25)
  const towers = game.towers.map((tower) => ({ ...tower, cooldown: Math.max(0, tower.cooldown - elapsed) }))
  let enemies = game.enemies.map((enemy) => ({ ...enemy, progress: enemy.progress + enemySpecs[enemy.kind].speed * (enemy.slow > 0 ? 0.48 : 1) * elapsed, slow: Math.max(0, enemy.slow - elapsed), hit: Math.max(0, (enemy.hit ?? 0) - elapsed) }))
  let spawned = game.spawned
  let spawnTimer = game.spawnTimer - elapsed
  let nextId = game.nextId
  if (spawned < waveSize(game.wave) && spawnTimer <= 0) {
    const kind = waveEnemy(game.wave, spawned)
    const hp = Math.round(enemySpecs[kind].hp * (1 + (game.wave - 1) * 0.21))
    enemies.push({ id: nextId++, kind, progress: 0, hp, maxHp: hp, slow: 0, hit: 0 })
    spawned++
    spawnTimer += Math.max(0.46, 0.92 - game.wave * 0.045)
  }

  let lives = game.lives
  for (const enemy of enemies) if (enemy.progress >= routeLength) lives -= enemySpecs[enemy.kind].leak
  enemies = enemies.filter((enemy) => enemy.progress < routeLength)
  if (lives <= 0) return { ...game, phase: 'lost', lives: 0, enemies, towers, spawned, spawnTimer, nextId, shots: [] }

  let gold = game.gold
  let score = game.score
  const shots = game.shots.filter((shot) => shot.remaining > elapsed).map((shot) => ({ ...shot, remaining: shot.remaining - elapsed }))
  for (const tower of towers) {
    if (tower.cooldown > 0) continue
    const spec = towerSpecs[tower.kind]
    const from = { x: tower.x, y: tower.y }
    const range = spec.range + (tower.level - 1) * 0.22
    const target = enemies.filter((enemy) => enemy.hp > 0 && distance(from, positionAt(enemy.progress)) <= range).sort((a, b) => b.progress - a.progress)[0]
    if (!target) continue
    const impact = positionAt(target.progress)
    const victims = tower.kind === 'cannon' ? enemies.filter((enemy) => enemy.hp > 0 && distance(impact, positionAt(enemy.progress)) <= 0.95) : [target]
    for (const victim of victims) {
      const raw = spec.damage * (1 + (tower.level - 1) * 0.75)
      victim.hp -= Math.max(1, Math.round(raw - (tower.kind === 'beam' ? 0 : enemySpecs[victim.kind].armor)))
      victim.hit = 0.16
      if (tower.kind === 'frost') victim.slow = 1.7
    }
    tower.cooldown = spec.interval / (1 + (tower.level - 1) * 0.12)
    const duration = tower.kind === 'beam' ? 0.32 : tower.kind === 'cannon' ? 0.48 : 0.36
    shots.push({ id: nextId++, from, to: impact, kind: tower.kind, remaining: duration, duration })
  }
  for (const enemy of enemies) if (enemy.hp <= 0) { gold += enemySpecs[enemy.kind].reward; score += enemySpecs[enemy.kind].reward * 10 }
  enemies = enemies.filter((enemy) => enemy.hp > 0)
  if (spawned >= waveSize(game.wave) && enemies.length === 0) {
    const phase = game.wave === lastWave ? 'won' : 'ready'
    return { ...game, phase, wave: phase === 'won' ? game.wave : game.wave + 1, gold: gold + 45 + game.wave * 12, score: score + game.wave * 100, enemies, towers, shots, spawned, spawnTimer, nextId, lives }
  }
  return { ...game, enemies, towers, shots, spawned, spawnTimer, nextId, lives, gold, score }
}
