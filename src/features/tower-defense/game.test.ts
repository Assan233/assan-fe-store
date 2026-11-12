import { describe, expect, it } from 'vitest'
import { buildTower, lastWave, newGame, onPath, positionAt, routeLength, sellTower, startWave, tick, upgradeTower, waveEnemy, waveSize, type Game } from './game'

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

  it('敌人沿道路行进，第 4 和 8 波各有最终巨像', () => {
    expect(positionAt(0)).toEqual({ x: 0, y: 3 })
    expect(positionAt(3)).toEqual({ x: 2, y: 2 })
    expect(positionAt(routeLength)).toEqual({ x: 11, y: 2 })
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
})
