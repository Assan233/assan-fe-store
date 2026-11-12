export const columns = 20
export const rows = 10
export const lastWave = 12

export type Point = { x: number; y: number }
export type TowerKind = 'arrow' | 'frost' | 'cannon' | 'beam' | 'venom' | 'storm'
export type EnemyKind = 'runner' | 'swarm' | 'guard' | 'boss' | 'scout' | 'shaman' | 'siege'
export type Phase = 'ready' | 'running' | 'won' | 'lost'

export type StageId = 'outpost' | 'oasis' | 'canyon' | 'ruins'
export const stages: Record<StageId, { name: string; terrain: string; description: string; color: number; path: Point[]; waves: number; gold: number; lives: number }> = {
  outpost: { name: '荒原前哨', terrain: '沙丘', description: '盘旋沙路 · 12 波攻势', color: 0xb9874b, waves: lastWave, gold: 240, lives: 18, path: [
    { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 1 }, { x: 5, y: 1 },
    { x: 5, y: 5 }, { x: 9, y: 5 }, { x: 9, y: 2 }, { x: 12, y: 2 },
    { x: 12, y: 7 }, { x: 15, y: 7 }, { x: 15, y: 3 }, { x: 19, y: 3 },
  ] },
  oasis: { name: '绿洲迷径', terrain: '绿洲', description: '棕榈水道 · 14 波快攻', color: 0x668c75, waves: 14, gold: 260, lives: 16, path: [
    { x: 0, y: 6 }, { x: 3, y: 6 }, { x: 3, y: 2 }, { x: 6, y: 2 },
    { x: 6, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 3 }, { x: 13, y: 3 },
    { x: 13, y: 6 }, { x: 16, y: 6 }, { x: 16, y: 1 }, { x: 19, y: 1 },
  ] },
  canyon: { name: '赤岩峡谷', terrain: '峡谷', description: '断崖回弯 · 16 波重甲', color: 0xb06b52, waves: 16, gold: 285, lives: 14, path: [
    { x: 0, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 5 }, { x: 7, y: 5 },
    { x: 7, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 8 }, { x: 14, y: 8 },
    { x: 14, y: 4 }, { x: 17, y: 4 }, { x: 17, y: 7 }, { x: 19, y: 7 },
  ] },
  ruins: { name: '失落古城', terrain: '遗迹', description: '荒草回廊 · 18 波精英', color: 0x847b91, waves: 18, gold: 310, lives: 12, path: [
    { x: 0, y: 8 }, { x: 2, y: 8 }, { x: 2, y: 2 }, { x: 5, y: 2 },
    { x: 5, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 1 }, { x: 11, y: 1 },
    { x: 11, y: 7 }, { x: 15, y: 7 }, { x: 15, y: 3 }, { x: 18, y: 3 },
    { x: 18, y: 5 }, { x: 19, y: 5 },
  ] },
}
export const stageIds = Object.keys(stages) as StageId[]
export const path = stages.outpost.path

export const towerSpecs: Record<TowerKind, { name: string; cost: number; damage: number; range: number; interval: number; description: string }> = {
  arrow: { name: '连弩塔', cost: 70, damage: 18, range: 2.25, interval: 0.48, description: '射速快，适合清理轻型敌人' },
  frost: { name: '霜冻塔', cost: 95, damage: 9, range: 2.15, interval: 0.8, description: '减速目标，为其他塔争取时间' },
  cannon: { name: '火炮塔', cost: 135, damage: 32, range: 2.45, interval: 1.35, description: '范围爆炸，专治成群敌人' },
  beam: { name: '光束塔', cost: 155, damage: 43, range: 2.55, interval: 1.1, description: '穿透护甲，优先打击精英' },
  venom: { name: '毒雾塔', cost: 110, damage: 7, range: 2.3, interval: 0.9, description: '持续腐蚀，克制厚血敌人' },
  storm: { name: '雷暴塔', cost: 175, damage: 27, range: 2.5, interval: 1.15, description: '闪电连锁，攻击邻近三个目标' },
}

export const enemySpecs: Record<EnemyKind, { name: string; hp: number; speed: number; armor: number; reward: number; leak: number }> = {
  runner: { name: '赤焰魔', hp: 46, speed: 1.85, armor: 0, reward: 14, leak: 1 },
  swarm: { name: '暗影魔', hp: 32, speed: 2.4, armor: 0, reward: 11, leak: 1 },
  guard: { name: '重甲魔', hp: 115, speed: 1.05, armor: 6, reward: 26, leak: 2 },
  boss: { name: '荒原巨魔', hp: 440, speed: 0.72, armor: 9, reward: 90, leak: 4 },
  scout: { name: '沙蜥斥候', hp: 40, speed: 3.1, armor: 0, reward: 16, leak: 1 },
  shaman: { name: '绿洲祭司', hp: 88, speed: 1.3, armor: 2, reward: 30, leak: 2 },
  siege: { name: '岩甲攻城兽', hp: 245, speed: 0.82, armor: 11, reward: 45, leak: 3 },
}

export type Tower = { id: number; kind: TowerKind; x: number; y: number; level: number; cooldown: number; spent: number }
export type Enemy = { id: number; kind: EnemyKind; progress: number; hp: number; maxHp: number; slow: number; poison?: number; hit?: number }
export type Shot = { id: number; from: Point; to: Point; kind: TowerKind; remaining: number; duration: number }
export type Game = {
  phase: Phase
  stage: StageId
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

/** Creates a fresh defense session for the selected map. */
export function newGame(stage: StageId = 'outpost'): Game {
  return { phase: 'ready', stage, wave: 1, lives: stages[stage].lives, gold: stages[stage].gold, score: 0, towers: [], enemies: [], shots: [], spawned: 0, spawnTimer: 0, nextId: 1 }
}

/** Reports whether a grid cell belongs to a stage's route. */
export function onPath(x: number, y: number, stage: StageId = 'outpost'): boolean {
  const route = stages[stage].path
  return route.some((point, index) => {
    if (index === 0) return point.x === x && point.y === y
    const previous = route[index - 1]
    return point.x === previous.x
      ? point.x === x && y >= Math.min(point.y, previous.y) && y <= Math.max(point.y, previous.y)
      : point.y === y && x >= Math.min(point.x, previous.x) && x <= Math.max(point.x, previous.x)
  })
}

/** Returns the total number of grid units traveled along a stage's route. */
export function lengthOf(stage: StageId = 'outpost'): number {
  const route = stages[stage].path
  return route.slice(1).reduce((length, point, index) => length + Math.abs(point.x - route[index].x) + Math.abs(point.y - route[index].y), 0)
}
export const routeLength = lengthOf()

/** Locates an enemy at a distance along a stage's route. */
export function positionAt(progress: number, stage: StageId = 'outpost'): Point {
  const route = stages[stage].path
  let remaining = Math.max(0, progress)
  for (let index = 1; index < route.length; index++) {
    const from = route[index - 1]
    const to = route[index]
    const length = Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
    if (remaining <= length) return { x: from.x + (to.x - from.x) * remaining / length, y: from.y + (to.y - from.y) * remaining / length }
    remaining -= length
  }
  return route[route.length - 1]
}

/** Purchases a tower on an empty cell; returns the original state for an invalid placement. */
export function buildTower(game: Game, kind: TowerKind, x: number, y: number): Game {
  const cost = towerSpecs[kind].cost
  if (game.phase === 'won' || game.phase === 'lost' || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= columns || y >= rows || onPath(x, y, game.stage) || game.gold < cost || game.towers.some((tower) => tower.x === x && tower.y === y)) return game
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

/** Returns the number of enemies in a wave for a given stage. */
export function waveSize(wave: number, stage: StageId = 'outpost'): number { return 7 + wave * 2 + (wave % 4 === 0 ? 1 : 0) + stageIds.indexOf(stage) * 2 }

/** Selects the enemy mix for each stage and wave. */
export function waveEnemy(wave: number, index: number, stage: StageId = 'outpost'): EnemyKind {
  if (wave % 4 === 0 && index === waveSize(wave, stage) - 1) return 'boss'
  if (stage === 'ruins' && wave >= 3 && index % 7 === 5) return 'shaman'
  if ((stage === 'canyon' || stage === 'ruins') && wave >= 2 && index % 6 === 4) return 'siege'
  if ((stage === 'oasis' || stage === 'ruins') && index % 3 === 2) return 'scout'
  if (stage === 'canyon' && index % 3 === 2) return 'guard'
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
  let enemies = game.enemies.map((enemy) => ({ ...enemy, progress: enemy.progress + enemySpecs[enemy.kind].speed * (enemy.slow > 0 ? 0.48 : 1) * elapsed, slow: Math.max(0, enemy.slow - elapsed), poison: Math.max(0, (enemy.poison ?? 0) - elapsed), hp: enemy.hp - ((enemy.poison ?? 0) > 0 ? 14 * elapsed : 0), hit: Math.max(0, (enemy.hit ?? 0) - elapsed) }))
  let spawned = game.spawned
  let spawnTimer = game.spawnTimer - elapsed
  let nextId = game.nextId
  if (spawned < waveSize(game.wave, game.stage) && spawnTimer <= 0) {
    const kind = waveEnemy(game.wave, spawned, game.stage)
    const hp = Math.round(enemySpecs[kind].hp * (1 + (game.wave - 1) * 0.21))
    enemies.push({ id: nextId++, kind, progress: 0, hp, maxHp: hp, slow: 0, poison: 0, hit: 0 })
    spawned++
    spawnTimer += Math.max(0.46, 0.92 - game.wave * 0.045)
  }

  let lives = game.lives
  for (const enemy of enemies) if (enemy.progress >= lengthOf(game.stage) && enemy.hp > 0) lives -= enemySpecs[enemy.kind].leak
  enemies = enemies.filter((enemy) => enemy.progress < lengthOf(game.stage) || enemy.hp <= 0)
  if (lives <= 0) return { ...game, phase: 'lost', lives: 0, enemies, towers, spawned, spawnTimer, nextId, shots: [] }

  let gold = game.gold
  let score = game.score
  for (const healer of enemies.filter((enemy) => enemy.kind === 'shaman' && enemy.hp > 0)) {
    for (const ally of enemies) if (ally.hp > 0 && ally.id !== healer.id && Math.abs(ally.progress - healer.progress) <= 1.6) ally.hp = Math.min(ally.maxHp, ally.hp + 8 * elapsed)
  }
  const shots = game.shots.filter((shot) => shot.remaining > elapsed).map((shot) => ({ ...shot, remaining: shot.remaining - elapsed }))
  for (const tower of towers) {
    if (tower.cooldown > 0) continue
    const spec = towerSpecs[tower.kind]
    const from = { x: tower.x, y: tower.y }
    const range = spec.range + (tower.level - 1) * 0.22
    const target = enemies.filter((enemy) => enemy.hp > 0 && distance(from, positionAt(enemy.progress, game.stage)) <= range).sort((a, b) => b.progress - a.progress)[0]
    if (!target) continue
    const impact = positionAt(target.progress, game.stage)
    const victims = tower.kind === 'cannon' ? enemies.filter((enemy) => enemy.hp > 0 && distance(impact, positionAt(enemy.progress, game.stage)) <= 0.95)
      : tower.kind === 'storm' ? [target, ...enemies.filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && distance(impact, positionAt(enemy.progress, game.stage)) <= 1.5).sort((a, b) => b.progress - a.progress).slice(0, 2)] : [target]
    for (const victim of victims) {
      const raw = spec.damage * (1 + (tower.level - 1) * 0.75)
      victim.hp -= Math.max(1, Math.round(raw - (tower.kind === 'beam' ? 0 : enemySpecs[victim.kind].armor)))
      victim.hit = 0.16
      if (tower.kind === 'frost') victim.slow = 1.7
      if (tower.kind === 'venom') victim.poison = 2.6
    }
    tower.cooldown = spec.interval / (1 + (tower.level - 1) * 0.12)
    const duration = tower.kind === 'beam' ? 0.32 : tower.kind === 'cannon' ? 0.48 : 0.36
    shots.push({ id: nextId++, from, to: impact, kind: tower.kind, remaining: duration, duration })
  }
  for (const enemy of enemies) if (enemy.hp <= 0) { gold += enemySpecs[enemy.kind].reward; score += enemySpecs[enemy.kind].reward * 10 }
  enemies = enemies.filter((enemy) => enemy.hp > 0)
  if (spawned >= waveSize(game.wave, game.stage) && enemies.length === 0) {
    const phase = game.wave === stages[game.stage].waves ? 'won' : 'ready'
    return { ...game, phase, wave: phase === 'won' ? game.wave : game.wave + 1, gold: gold + 45 + game.wave * 12, score: score + game.wave * 100, enemies, towers, shots, spawned, spawnTimer, nextId, lives }
  }
  return { ...game, enemies, towers, shots, spawned, spawnTimer, nextId, lives, gold, score }
}
