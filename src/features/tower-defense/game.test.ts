import { describe, expect, it } from 'vitest'
import { buildTower, columns, lastWave, lengthOf, newGame, onPath, positionAt, routeLength, rows, sellTower, stageIds, stages, startWave, tick, upgradeTower, waveEnemy, waveSize, type Game } from './game'

describe('荒漠塔防规则', () => {
  it('保护通道、边界、空地及资源约束，升级和出售按投入结算', () => {
    const initial = newGame()
    expect(onPath(2, 2)).toBe(true)
    expect(onPath(4, 4)).toBe(false)
    expect(buildTower(initial, 'arrow', 2, 2)).toBe(initial)
    expect(buildTower(initial, 'arrow', -1, 0)).toBe(initial)
    const built = buildTower(initial, 'arrow', 3, 3)
    expect(built.gold).toBe(170)
    expect(initial.towers).toHaveLength(0)
    expect(buildTower(built, 'frost', 3, 3)).toBe(built)
    const broke = { ...built, gold: 0 }
    expect(buildTower(broke, 'beam', 4, 3)).toBe(broke)
    const upgraded = upgradeTower(built, built.towers[0].id)
    expect(upgraded.towers[0].level).toBe(2)
    expect(upgraded.gold).toBe(100)
    expect(sellTower(upgraded, built.towers[0].id).gold).toBe(191)
  })

  it('敌人沿道路行进，每四波出现一只首领', () => {
    expect(positionAt(0)).toEqual({ x: 0, y: 3 })
    expect(positionAt(3)).toEqual({ x: 2, y: 2 })
    expect(positionAt(routeLength)).toEqual({ x: columns - 1, y: 3 })
    expect(waveEnemy(4, waveSize(4) - 1)).toBe('boss')
    expect(waveEnemy(8, waveSize(8) - 1)).toBe('boss')
    expect(waveEnemy(2, 3)).toBe('guard')
  })

  it('开波后自动生成敌人，防御塔命中并给予击杀收益', () => {
    const built = buildTower(newGame(), 'arrow', 1, 4)
    const running = startWave(built)
    expect(startWave(running)).toBe(running)
    const next = tick(running, 0.1)
    expect(next.spawned).toBe(1)
    expect(next.enemies[0].hp).toBeLessThan(next.enemies[0].maxHp)
    expect(next.shots).toHaveLength(1)
    expect(running.enemies).toHaveLength(0)
    const nearlyDead = { ...next, spawned: waveSize(1), enemies: [{ ...next.enemies[0], hp: 1 }], towers: [{ ...next.towers[0], cooldown: 0 }] }
    const cleared = tick(nearlyDead, 0.1)
    expect(cleared.phase).toBe('ready')
    expect(cleared.wave).toBe(2)
    expect(cleared.gold).toBeGreaterThan(nearlyDead.gold)
  })

  it('防御塔闲置很久后重新遇敌仍遵循射击间隔', () => {
    const tower = buildTower(newGame(), 'arrow', 1, 4).towers[0]
    const idle = tick({ ...newGame(), phase: 'running', towers: [tower], spawned: 1, spawnTimer: 100 }, 0.1)
    expect(idle.towers[0].cooldown).toBe(0)
    const enemy = { id: 55, kind: 'guard' as const, progress: 1, hp: 200, maxHp: 200, slow: 0 }
    const hit = tick({ ...idle, enemies: [enemy] }, 0.1)
    expect(hit.shots).toHaveLength(1)
    const waiting = tick(hit, 0.1)
    expect(waiting.shots).toHaveLength(1)
    expect(waiting.enemies[0].hp).toBe(hit.enemies[0].hp)
  })

  it('不同武器保留独立弹道时长，弹道随时间消散', () => {
    for (const kind of ['arrow', 'frost', 'cannon', 'beam'] as const) {
      const tower = buildTower({ ...newGame(), gold: 500 }, kind, 1, 4).towers[0]
      const enemy = { id: 71, kind: 'boss' as const, progress: 0, hp: 1000, maxHp: 1000, slow: 0 }
      const fired = tick({ ...newGame(), phase: 'running', towers: [tower], enemies: [enemy], spawned: 1, spawnTimer: 100 }, .1)
      expect(fired.shots).toHaveLength(1)
      expect(fired.shots[0].duration).toBe(kind === 'cannon' ? .48 : kind === 'beam' ? .32 : .36)
      expect(fired.shots[0].remaining).toBe(fired.shots[0].duration)
      const fading = tick(fired, .1)
      expect(fading.shots[0].remaining).toBeLessThan(fading.shots[0].duration)
      let ended: Game = { ...fading, towers: [] }
      for (let frame = 0; frame < 5; frame++) ended = tick(ended, .1)
      expect(ended.shots).toHaveLength(0)
    }
  })

  it('初始资源足够布置一条能守住首波的防线', () => {
    let game = newGame()
    for (const [x, y] of [[1, 2], [3, 2], [7, 4]]) game = buildTower(game, 'arrow', x, y)
    game = startWave(game)
    for (let frame = 0; frame < 1500 && game.phase === 'running'; frame++) game = tick(game, 0.1)
    expect(game.phase).toBe('ready')
    expect(game.wave).toBe(2)
    expect(game.lives).toBeGreaterThan(0)
  })

  it('霜冻减速、火炮群伤，失守及最终通关状态正确', () => {
    const frost = buildTower(newGame(), 'frost', 1, 4).towers[0]
    const cannon = buildTower(newGame(), 'cannon', 3, 4).towers[0]
    const first = { id: 50, kind: 'runner' as const, progress: 2, hp: 100, maxHp: 100, slow: 0 }
    const second = { ...first, id: 51, progress: 2.2 }
    const hit = tick({ ...newGame(), phase: 'running', towers: [frost, cannon], enemies: [first, second], spawned: 1 }, 0.1)
    expect(hit.enemies.some((enemy) => enemy.slow > 0)).toBe(true)
    expect(hit.enemies.every((enemy) => enemy.hp < 100)).toBe(true)
    const escaped = tick({ ...newGame(), phase: 'running', lives: 1, enemies: [{ ...first, progress: routeLength - 0.01 }], spawned: 1 }, 0.1)
    expect(escaped.phase).toBe('lost')
    expect(escaped.lives).toBe(0)
    const final = tick({ ...newGame(), phase: 'running', wave: lastWave, spawned: waveSize(lastWave) }, 0.1)
    expect(final.phase).toBe('won')
    expect(buildTower(final, 'arrow', 1, 4)).toBe(final)
  })

  it('每张地图的路线、起点终点与建造限制相符，并配置独立敌群', () => {
    expect(stageIds).toHaveLength(4)
    expect([columns, rows]).toEqual([20, 10])
    expect(stageIds.map((stage) => stages[stage].waves)).toEqual([12, 14, 16, 18])
    for (const stage of stageIds) {
      const game = newGame(stage)
      const start = stages[stage].path[0]
      const end = stages[stage].path.at(-1)!
      expect(positionAt(0, stage)).toEqual(start)
      expect(positionAt(lengthOf(stage), stage)).toEqual(end)
      expect(start.x).toBe(0)
      expect(end.x).toBe(columns - 1)
      expect(lengthOf(stage)).toBeGreaterThan(35)
      for (let distance = 0; distance <= lengthOf(stage); distance++) {
        const position = positionAt(distance, stage)
        expect(onPath(position.x, position.y, stage)).toBe(true)
      }
      for (const point of stages[stage].path) expect(onPath(point.x, point.y, stage)).toBe(true)
      expect(buildTower(game, 'arrow', start.x, start.y)).toBe(game)
      expect(buildTower(game, 'arrow', columns - 1, rows)).toBe(game)
      expect(game.lives).toBe(stages[stage].lives)
      expect(waveEnemy(4, waveSize(4, stage) - 1, stage)).toBe('boss')
      const final = tick({ ...game, phase: 'running', wave: stages[stage].waves, spawned: waveSize(stages[stage].waves, stage) }, .1)
      expect(final.phase).toBe('won')
    }
    expect(onPath(3, 4, 'oasis')).toBe(true)
    expect(onPath(3, 4, 'outpost')).toBe(false)
    expect(waveEnemy(1, 2, 'oasis')).toBe('scout')
    expect(waveEnemy(2, 4, 'canyon')).toBe('siege')
    expect(waveEnemy(3, 5, 'ruins')).toBe('shaman')
  })

  it('毒雾造成持续伤害，雷暴只连锁附近至多三名敌人', () => {
    const enemy = { id: 21, kind: 'guard' as const, progress: 1, hp: 100, maxHp: 100, slow: 0 }
    const venom = buildTower(newGame(), 'venom', 1, 4).towers[0]
    const poisoned = tick({ ...newGame(), phase: 'running', towers: [venom], enemies: [enemy], spawned: 1, spawnTimer: 100 }, 0.1)
    expect(poisoned.enemies[0].poison).toBeGreaterThan(0)
    const after = tick(poisoned, 0.1)
    expect(after.enemies[0].hp).toBeLessThan(poisoned.enemies[0].hp)
    const storm = buildTower(newGame(), 'storm', 1, 4).towers[0]
    const crowd = [1, 1.2, 1.4, 1.6].map((progress, id) => ({ ...enemy, id: id + 30, progress }))
    const shocked = tick({ ...newGame(), phase: 'running', towers: [storm], enemies: crowd, spawned: 1, spawnTimer: 100 }, 0.1)
    expect(shocked.enemies.filter((unit) => unit.hp < 100)).toHaveLength(3)
  })

  it('祭司治疗附近受伤同伴，但不会超过生命上限', () => {
    const shaman = { id: 40, kind: 'shaman' as const, progress: 1, hp: 88, maxHp: 88, slow: 0 }
    const ally = { id: 41, kind: 'guard' as const, progress: 1.5, hp: 99, maxHp: 100, slow: 0 }
    const distant = { ...ally, id: 42, progress: 5 }
    const healed = tick({ ...newGame('ruins'), phase: 'running', enemies: [shaman, ally, distant], spawned: 1, spawnTimer: 100 }, .2)
    expect(healed.enemies.find((unit) => unit.id === 41)?.hp).toBe(100)
    expect(healed.enemies.find((unit) => unit.id === 42)?.hp).toBe(99)
  })
})
