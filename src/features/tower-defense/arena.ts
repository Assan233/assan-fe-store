import Phaser from 'phaser'
import { gsap } from 'gsap'
import { columns, path, positionAt, rows, type Enemy, type Game, type Shot, type Tower } from './game'
import { textureSvg } from './art'

const TILE = 100
const WIDTH = columns * TILE
const HEIGHT = rows * TILE
const colors = { arrow: 0x8bffe0, frost: 0x9feaff, cannon: 0xffb778, beam: 0xe8adff }
const center = (value: number) => (value + 0.5) * TILE

type Unit = { container: Phaser.GameObjects.Container; image: Phaser.GameObjects.Image; health?: Phaser.GameObjects.Graphics }

class Battlefield extends Phaser.Scene {
  private towers = new Map<number, Unit>()
  private enemies = new Map<number, Unit>()
  private shotsLayer!: Phaser.GameObjects.Graphics
  private selection!: Phaser.GameObjects.Graphics
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter
  private seenShots = new Set<number>()
  private effects = new Map<gsap.core.Timeline, () => void>()
  private motionPaused = false
  private speed = 1
  private previous?: { phase: Game['phase']; wave: number }
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private ready = false
  private pending?: { game: Game; selected: number | null; paused: boolean; speed: number }

  constructor() { super('battlefield') }

  preload() {
    for (const kind of ['arrow', 'frost', 'cannon', 'beam', 'runner', 'swarm', 'guard', 'boss'] as const) {
      this.load.svg(`unit-${kind}`, `data:image/svg+xml;base64,${btoa(textureSvg(kind))}`, { width: 140, height: 140 })
    }
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearEffects())
    this.drawTerrain()
    const spark = this.make.graphics({ x: 0, y: 0 })
    spark.fillStyle(0xffffff).fillCircle(7, 7, 7).generateTexture('spark', 14, 14).destroy()
    this.sparkles = this.add.particles(0, 0, 'spark', {
      emitting: false, speed: { min: 70, max: 250 }, lifespan: { min: 240, max: 650 },
      scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(12)
    this.selection = this.add.graphics().setDepth(3)
    this.shotsLayer = this.add.graphics().setDepth(10)
    this.ready = true
    if (this.pending) this.sync(this.pending.game, this.pending.selected, this.pending.paused, this.pending.speed)
  }

  private clearEffects() {
    for (const [animation, cleanup] of this.effects) { animation.kill(); cleanup() }
    this.effects.clear()
  }

  private playEffect(animation: gsap.core.Timeline, cleanup: () => void) {
    this.effects.set(animation, cleanup)
    animation.eventCallback('onComplete', () => { this.effects.delete(animation); cleanup() })
    animation.timeScale(this.speed).paused(this.motionPaused)
  }

  private impact(shot: Shot, x: number, y: number) {
    if (this.reduced || this.effects.size >= 64) return
    const color = colors[shot.kind]
    const radius = shot.kind === 'cannon' ? 64 : shot.kind === 'frost' ? 51 : 32
    const core = this.add.circle(0, 0, radius * 0.28, 0xffffff, 0.95)
    const inner = this.add.circle(0, 0, radius * 0.75, color, 0.18).setStrokeStyle(5, color, 0.9)
    const outer = this.add.circle(0, 0, radius, color, 0.12).setStrokeStyle(3, 0xffffff, 0.8)
    const streaks = this.add.graphics()
    streaks.lineStyle(shot.kind === 'cannon' ? 5 : 3, color, 0.9)
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6
      streaks.lineBetween(Math.cos(angle) * radius * 0.65, Math.sin(angle) * radius * 0.65,
        Math.cos(angle) * radius * (i % 2 ? 1.1 : 1.45), Math.sin(angle) * radius * (i % 2 ? 1.1 : 1.45))
    }
    const burst = this.add.container(x, y, [outer, inner, core, streaks]).setDepth(11).setBlendMode(Phaser.BlendModes.ADD)
    burst.setScale(0.12).setAlpha(0)
    const animation = gsap.timeline({ paused: true, delay: shot.remaining })
      .to(burst, { scale: 1, alpha: 1, duration: 0.12, ease: 'back.out(2)' })
      .to(burst, { scale: shot.kind === 'cannon' ? 2.25 : 1.7, alpha: 0, rotation: 0.24, duration: 0.5, ease: 'power3.out' })
    animation.eventCallback('onStart', () => {
      this.sparkles.explode(shot.kind === 'cannon' ? 28 : 12, x, y)
      if (shot.kind === 'cannon') this.cameras.main.shake(120, 0.003)
    })
    this.playEffect(animation, () => burst.destroy())
  }

  private announceWave(wave: number) {
    if (this.reduced) return
    const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x70eadd, 0).setDepth(8)
    const title = this.add.text(WIDTH / 2, HEIGHT * 0.23, `第 ${wave} 波 · 防线启动`, {
      fontFamily: 'sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#e7fffb',
      stroke: '#123b52', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(13).setAlpha(0).setScale(0.6)
    const animation = gsap.timeline({ paused: true })
      .to(veil, { alpha: 0.18, duration: 0.2 })
      .to(veil, { alpha: 0, duration: 0.7 })
      .to(title, { alpha: 1, scale: 1, y: HEIGHT * 0.2, duration: 0.45, ease: 'back.out(1.7)' }, 0)
      .to(title, { alpha: 0, y: HEIGHT * 0.16, duration: 0.4, ease: 'power2.in' }, 1.05)
    this.playEffect(animation, () => { veil.destroy(); title.destroy() })
  }

  private drawTerrain() {
    const ground = this.add.graphics()
    ground.fillGradientStyle(0x11243d, 0x172b45, 0x1c4358, 0x152941).fillRect(0, 0, WIDTH, HEIGHT)
    // Deterministic details keep the map stable across resets and remounts.
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const seed = (x * 37 + y * 67 + 13) % 17
      const px = x * TILE, py = y * TILE
      ground.lineStyle(1, 0xa9e8ee, 0.12).strokeRect(px + 3, py + 3, TILE - 6, TILE - 6)
      ground.fillStyle(seed % 3 ? 0x428da1 : 0x6797b5, 0.16).fillCircle(px + 18 + seed * 3, py + 26 + seed * 2, 10 + seed)
      ground.lineStyle(2, 0x78cfd2, 0.14).strokeCircle(px + TILE / 2, py + TILE / 2, 30)
      ground.fillStyle(0xcafefa, 0.2).fillCircle(px + 12, py + 12, 2)
      ground.fillStyle(0xcafefa, 0.2).fillCircle(px + 88, py + 88, 2)
    }

    const road = this.add.graphics()
    const route = path.map(({ x, y }) => ({ x: center(x), y: center(y) }))
    for (const [width, color, alpha] of [[104, 0x060f24, 0.85], [88, 0x27465c, 1], [75, 0x34576b, 1], [64, 0x1d344e, 1]] as const) {
      road.lineStyle(width, color, alpha).beginPath().moveTo(route[0].x, route[0].y)
      for (const point of route.slice(1)) road.lineTo(point.x, point.y)
      road.strokePath()
      for (const point of route) road.fillStyle(color, alpha).fillCircle(point.x, point.y, width / 2)
    }
    road.lineStyle(2, 0x80efe0, 0.55).beginPath().moveTo(route[0].x, route[0].y)
    for (const point of route.slice(1)) road.lineTo(point.x, point.y)
    road.strokePath()
    for (const point of route) {
      road.lineStyle(2, 0x6cd8d9, 0.36).strokeCircle(point.x, point.y, 31)
      road.fillStyle(0xa8ffff, 0.36).fillCircle(point.x, point.y, 4)
    }
    for (let i = 0; i < 7; i++) {
      const beacon = this.add.circle(route[0].x, route[0].y, 5, 0x9affdf, 0.8).setDepth(1)
      const points = route.map((point) => ({ x: point.x, y: point.y }))
      if (this.reduced) { beacon.destroy(); break }
      this.tweens.add({ targets: beacon, ease: 'Linear', duration: 4500, repeat: -1, delay: i * 650,
        onUpdate: (tween) => {
          const p = tween.progress * (points.length - 1), index = Math.min(points.length - 2, Math.floor(p))
          beacon.setPosition(Phaser.Math.Linear(points[index].x, points[index + 1].x, p - index), Phaser.Math.Linear(points[index].y, points[index + 1].y, p - index))
          beacon.setAlpha(0.25 + Math.sin(p * 6) * 0.2)
        },
      })
    }
  }

  /** Mirrors an immutable simulation snapshot without changing game rules. */
  sync(game: Game, selected: number | null, paused: boolean, speed: number) {
    this.pending = { game, selected, paused, speed }
    if (!this.ready) return
    this.motionPaused = paused || this.reduced
    this.speed = speed
    this.tweens.timeScale = this.motionPaused ? 0 : speed
    for (const animation of this.effects.keys()) animation.timeScale(speed).paused(this.motionPaused)
    this.sparkles.active = !paused && !this.reduced
    if (game.phase === 'ready' && game.wave === 1 && this.previous?.phase !== 'ready') {
      this.clearEffects()
      this.seenShots.clear()
    }
    if (game.phase === 'running' && (this.previous?.phase !== 'running' || this.previous.wave !== game.wave)) this.announceWave(game.wave)
    this.previous = { phase: game.phase, wave: game.wave }
    this.syncTowers(game.towers)
    this.syncEnemies(game.enemies)
    this.drawShots(game.shots)
    this.selection.clear()
    const tower = game.towers.find((unit) => unit.id === selected)
    if (tower) {
      this.selection.lineStyle(3, 0xc6ffb1, 0.85).strokeCircle(center(tower.x), center(tower.y), 49)
      this.selection.lineStyle(1, 0xc6ffb1, 0.2).strokeCircle(center(tower.x), center(tower.y), 62)
    }
  }

  private syncTowers(towers: Tower[]) {
    const ids = new Set(towers.map((tower) => tower.id))
    for (const [id, unit] of this.towers) if (!ids.has(id)) { unit.container.destroy(); this.towers.delete(id) }
    for (const tower of towers) {
      let unit = this.towers.get(tower.id)
      if (!unit) {
        const halo = this.add.circle(0, 0, 48, colors[tower.kind], 0.12).setStrokeStyle(2, colors[tower.kind], 0.5)
        const image = this.add.image(0, 0, `unit-${tower.kind}`).setDisplaySize(94, 94)
        const container = this.add.container(center(tower.x), center(tower.y), [halo, image]).setDepth(4)
        if (!this.reduced) this.tweens.add({ targets: halo, scale: 1.13, alpha: 0.24, yoyo: true, repeat: -1, duration: 1500 + tower.id * 53 % 750 })
        unit = { container, image }
        this.towers.set(tower.id, unit)
        if (!this.reduced) { container.setScale(0.15); this.tweens.add({ targets: container, scale: 1, duration: 300, ease: 'Back.Out' }) }
      }
      unit.image.setTint(tower.level === 3 ? 0xfff2bb : 0xffffff)
    }
  }

  private syncEnemies(enemies: Enemy[]) {
    const ids = new Set(enemies.map((enemy) => enemy.id))
    for (const [id, unit] of this.enemies) if (!ids.has(id)) {
      if (!this.reduced) this.sparkles.explode(12, unit.container.x, unit.container.y)
      unit.container.destroy(); this.enemies.delete(id)
    }
    for (const enemy of enemies) {
      const pos = positionAt(enemy.progress)
      const x = center(pos.x), y = center(pos.y)
      let unit = this.enemies.get(enemy.id)
      if (!unit) {
        const shadow = this.add.ellipse(0, 18, 65, 24, 0x050b1a, 0.55)
        const image = this.add.image(0, 0, `unit-${enemy.kind}`).setDisplaySize(enemy.kind === 'boss' ? 112 : enemy.kind === 'swarm' ? 61 : 80, enemy.kind === 'boss' ? 112 : enemy.kind === 'swarm' ? 61 : 80)
        const health = this.add.graphics()
        const container = this.add.container(x, y, [shadow, image, health]).setDepth(6)
        unit = { container, image, health }
        this.enemies.set(enemy.id, unit)
        if (!this.reduced) this.tweens.add({ targets: image, y: -5, duration: enemy.kind === 'swarm' ? 160 : 420, yoyo: true, repeat: -1 })
      }
      unit.container.setPosition(x, y)
      unit.image.setTint(enemy.hit ? 0xffffff : enemy.slow > 0 ? 0xa3d9ff : 0xffffff)
      unit.image.setAlpha(enemy.hit ? 0.75 : 1)
      unit.health?.clear().fillStyle(0x0b1629).fillRoundedRect(-38, -48, 76, 8, 3)
        .fillStyle(enemy.hp / enemy.maxHp < 0.3 ? 0xff797e : 0x8cffa9)
        .fillRoundedRect(-36, -46, Math.max(0, 72 * enemy.hp / enemy.maxHp), 4, 2)
    }
  }

  private drawShots(shots: Shot[]) {
    const ids = new Set(shots.map((shot) => shot.id))
    const layer = this.shotsLayer.clear()
    for (const shot of shots) {
      const from = { x: center(shot.from.x), y: center(shot.from.y) }
      const to = { x: center(shot.to.x), y: center(shot.to.y) }
      const progress = 1 - shot.remaining / shot.duration
      const x = Phaser.Math.Linear(from.x, to.x, progress)
      const y = Phaser.Math.Linear(from.y, to.y, progress)
      const color = colors[shot.kind]
      if (!this.seenShots.has(shot.id)) {
        this.impact(shot, to.x, to.y)
        const tower = [...this.towers.values()].find((unit) => unit.container.x === from.x && unit.container.y === from.y)
        if (tower) {
          tower.image.setRotation(Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2)
          if (!this.reduced) this.tweens.add({ targets: tower.image, scale: 0.8, duration: 75, yoyo: true })
        }
        if (!this.reduced) this.sparkles.explode(shot.kind === 'cannon' ? 15 : 7, from.x, from.y)
      }
      if (shot.kind === 'beam') {
        layer.lineStyle(24, color, (1 - progress) * 0.26).lineBetween(from.x, from.y, to.x, to.y)
        layer.lineStyle(8, color, 0.8).lineBetween(from.x, from.y, to.x, to.y)
        layer.lineStyle(3, 0xffffff, 0.94).lineBetween(from.x, from.y, to.x, to.y)
      } else {
        layer.lineStyle(16, color, 0.15).lineBetween(from.x, from.y, x, y)
        layer.lineStyle(shot.kind === 'cannon' ? 6 : 3, color, 0.8).lineBetween(from.x, from.y, x, y)
        layer.fillStyle(color, 0.22).fillCircle(x, y, shot.kind === 'cannon' ? 19 : 13)
        layer.fillStyle(0xffffff, 0.95).fillCircle(x, y, shot.kind === 'cannon' ? 8 : 5)
      }
      if (shot.kind === 'cannon' || shot.kind === 'frost') {
        layer.lineStyle(3, color, 0.6 * progress).strokeCircle(to.x, to.y, (shot.kind === 'cannon' ? 75 : 32) * progress)
      }
    }
    this.seenShots = ids
  }
}

/** Mounts the visual-only Phaser scene and returns a controller for React snapshots. */
export function mountArena(parent: HTMLElement): { sync: (game: Game, selected: number | null, paused: boolean, speed: number) => void; destroy: () => void } {
  const scene = new Battlefield()
  const renderer = new Phaser.Game({ type: Phaser.AUTO, parent, width: WIDTH, height: HEIGHT,
    backgroundColor: '#14253b', transparent: false, render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.NONE }, scene: [scene], audio: { noAudio: true },
  })
  return { sync: (game, selected, paused, speed) => scene.sync(game, selected, paused, speed), destroy: () => renderer.destroy(true) }
}
