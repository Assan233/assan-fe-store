import Phaser from 'phaser'
import { gsap } from 'gsap'
import { columns, positionAt, rows, stages, type Enemy, type Game, type Shot, type StageId, type Tower } from './game'
import { effectAssets, enemyKinds, enemyRunAsset, sceneAsset, terrainAssets, towerAsset, towerKinds } from './assets'

const TILE = 100
const WIDTH = columns * TILE
const HEIGHT = rows * TILE
const colors = { arrow: 0xffdf87, frost: 0x9feaff, cannon: 0xff995a, beam: 0xe8adff, venom: 0x8de888, storm: 0xffe76c }
const center = (value: number) => (value + 0.5) * TILE
const faceTarget = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.atan2(to.y - from.y, to.x - from.x)

function fit<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(image: T, size: number): T {
  const scale = size / Math.max(image.width, image.height)
  image.setDisplaySize(image.width * scale, image.height * scale)
  return image
}

type Unit = { container: Phaser.GameObjects.Container; image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; health?: Phaser.GameObjects.Graphics }

class Battlefield extends Phaser.Scene {
  private towers = new Map<number, Unit>()
  private enemies = new Map<number, Unit>()
  private projectiles = new Map<number, Phaser.GameObjects.Image>()
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
  private stage: StageId = 'outpost'

  constructor() { super('battlefield') }

  preload() {
    for (const name of terrainAssets) this.load.image(name, sceneAsset(name))
    for (const name of effectAssets) this.load.image(name, sceneAsset(name))
    for (const kind of towerKinds) this.load.image(`tower-${kind}`, towerAsset(kind))
    for (const kind of enemyKinds) this.load.spritesheet(`enemy-${kind}`, enemyRunAsset(kind), { frameWidth: 128, frameHeight: 128 })
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearEffects())
    for (const kind of enemyKinds) this.anims.create({ key: `run-${kind}`, frames: this.anims.generateFrameNumbers(`enemy-${kind}`, { start: 0, end: 9 }), frameRate: kind === 'swarm' ? 16 : 11, repeat: -1 })
    this.stage = this.pending?.game.stage ?? 'outpost'
    this.drawTerrain()
    this.sparkles = this.add.particles(0, 0, 'bullet-arrow', {
      emitting: false, speed: { min: 70, max: 250 }, lifespan: { min: 240, max: 650 },
      scale: { start: 0.85, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD,
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
    const flame = shot.kind === 'cannon' ? fit(this.add.image(0, 0, 'fire'), 65).setAlpha(0.9) : null
    const streaks = this.add.graphics()
    streaks.lineStyle(shot.kind === 'cannon' ? 5 : 3, color, 0.9)
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6
      streaks.lineBetween(Math.cos(angle) * radius * 0.65, Math.sin(angle) * radius * 0.65,
        Math.cos(angle) * radius * (i % 2 ? 1.1 : 1.45), Math.sin(angle) * radius * (i % 2 ? 1.1 : 1.45))
    }
    const burst = this.add.container(x, y, flame ? [outer, inner, flame, core, streaks] : [outer, inner, core, streaks]).setDepth(11).setBlendMode(Phaser.BlendModes.ADD)
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
    const veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0xf7cd79, 0).setDepth(8)
    const title = this.add.text(WIDTH / 2, HEIGHT * 0.23, `第 ${wave} 波 · 魔物来袭`, {
      fontFamily: 'sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#fff2ce',
      stroke: '#513322', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(13).setAlpha(0).setScale(0.6)
    const animation = gsap.timeline({ paused: true })
      .to(veil, { alpha: 0.18, duration: 0.2 })
      .to(veil, { alpha: 0, duration: 0.7 })
      .to(title, { alpha: 1, scale: 1, y: HEIGHT * 0.2, duration: 0.45, ease: 'back.out(1.7)' }, 0)
      .to(title, { alpha: 0, y: HEIGHT * 0.16, duration: 0.4, ease: 'power2.in' }, 1.05)
    this.playEffect(animation, () => { veil.destroy(); title.destroy() })
  }

  private drawTerrain() {
    const { path, color, terrain } = stages[this.stage]
    this.add.image(WIDTH / 2, HEIGHT / 2, 'sand').setDisplaySize(WIDTH, HEIGHT)
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, color, 0.3)
    const decoration = this.add.graphics().setDepth(1)
    for (let i = 0; i < 15; i++) {
      const x = ((i * 347 + 97) % WIDTH), y = ((i * 241 + 179) % HEIGHT)
      if (terrain === '绿洲') decoration.fillStyle(0x367662, 0.45).fillEllipse(x, y, 90, 37)
      if (terrain === '峡谷') decoration.fillStyle(0x703e33, 0.55).fillRoundedRect(x, y, 46, 27, 7)
      if (terrain === '遗迹') decoration.lineStyle(7, 0xd4c1a4, 0.55).strokeRect(x, y, 38, 32)
    }
    const road = this.add.graphics().setDepth(1)
    const points = [{ x: -TILE / 2, y: center(path[0].y) }, ...path.map(({ x, y }) => ({ x: center(x), y: center(y) })), { x: WIDTH + TILE / 2, y: center(path[path.length - 1].y) }]
    road.lineStyle(99, 0x5d3624, 0.42).strokePoints(points)
    road.lineStyle(86, 0xb6753b, 0.85).strokePoints(points)
    road.lineStyle(72, 0xd2a05a, 0.62).strokePoints(points)
    road.lineStyle(2, 0xf4d293, 0.23).strokePoints(points)
    const grid = this.add.graphics().setDepth(2)
    grid.lineStyle(1, 0x51301b, 0.13)
    for (let x = 1; x < columns; x++) grid.lineBetween(x * TILE, 0, x * TILE, HEIGHT)
    for (let y = 1; y < rows; y++) grid.lineBetween(0, y * TILE, WIDTH, y * TILE)
    this.add.circle(center(11), center(path[path.length - 1].y), 39, 0x562c22, 0.72).setStrokeStyle(5, 0xf9d47e, 0.8).setDepth(2)
  }

  /** Mirrors an immutable simulation snapshot without changing game rules. */
  sync(game: Game, selected: number | null, paused: boolean, speed: number) {
    this.pending = { game, selected, paused, speed }
    if (!this.ready) return
    this.motionPaused = paused || this.reduced
    this.speed = speed
    this.tweens.timeScale = this.motionPaused ? 0 : speed
    for (const animation of this.effects.keys()) animation.timeScale(speed).paused(this.motionPaused)
    this.sparkles.active = !this.motionPaused
    if (game.phase === 'ready' && game.wave === 1 && (this.previous?.phase !== 'ready' || this.previous.wave !== 1)) {
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
      this.selection.lineStyle(4, 0xffed99, 0.9).strokeCircle(center(tower.x), center(tower.y), 46)
      this.selection.lineStyle(2, 0xffed99, 0.3).strokeCircle(center(tower.x), center(tower.y), 59)
    }
  }

  private syncTowers(towers: Tower[]) {
    const ids = new Set(towers.map((tower) => tower.id))
    for (const [id, unit] of this.towers) if (!ids.has(id)) { unit.container.destroy(); this.towers.delete(id) }
    for (const tower of towers) {
      let unit = this.towers.get(tower.id)
      if (!unit) {
        const base = this.add.ellipse(0, 29, 82, 27, 0x542f24, 0.48).setStrokeStyle(2, 0xf2cc88, 0.5)
        const image = fit(this.add.image(0, -5, `tower-${tower.kind}`), 91)
        const container = this.add.container(center(tower.x), center(tower.y), [base, image]).setDepth(4)
        unit = { container, image }
        this.towers.set(tower.id, unit)
        if (!this.reduced) { container.setScale(0.15); this.tweens.add({ targets: container, scale: 1, duration: 300, ease: 'Back.Out' }) }
      }
      unit.image.setTint(tower.level === 3 ? 0xfff2bb : tower.kind === 'venom' ? 0x98ec7e : tower.kind === 'storm' ? 0xffd96d : 0xffffff)
    }
  }

  private syncEnemies(enemies: Enemy[]) {
    const ids = new Set(enemies.map((enemy) => enemy.id))
    for (const [id, unit] of this.enemies) if (!ids.has(id)) {
      if (!this.reduced) this.sparkles.explode(12, unit.container.x, unit.container.y)
      unit.container.destroy(); this.enemies.delete(id)
    }
    for (const enemy of enemies) {
      const pos = positionAt(enemy.progress, this.stage)
      const x = center(pos.x), y = center(pos.y)
      let unit = this.enemies.get(enemy.id)
      if (!unit) {
        const size = enemy.kind === 'boss' || enemy.kind === 'siege' ? 90 : enemy.kind === 'swarm' || enemy.kind === 'scout' ? 53 : 64
        const shadow = this.add.ellipse(0, 22, size * 0.7, 18, 0x291d18, 0.3)
        const image = fit(this.add.sprite(0, -6, `enemy-${enemy.kind}`), size)
        if (!this.reduced) image.play(`run-${enemy.kind}`)
        const health = this.add.graphics()
        const container = this.add.container(x, y, [shadow, image, health]).setDepth(6)
        unit = { container, image, health }
        this.enemies.set(enemy.id, unit)
      }
      unit.container.setPosition(x, y)
      const ahead = positionAt(enemy.progress + 0.025, this.stage)
      unit.image.setFlipX(ahead.x < pos.x)
      if (unit.image instanceof Phaser.GameObjects.Sprite) {
        if (this.motionPaused) unit.image.anims.pause()
        else if (!this.reduced) unit.image.anims.resume()
      }
      unit.image.setTint(enemy.hit ? 0xff9696 : enemy.slow > 0 ? 0xa3d9ff : enemy.poison ? 0x9bed8a : enemy.kind === 'scout' ? 0xf8d078 : enemy.kind === 'shaman' ? 0x7cf5bc : enemy.kind === 'siege' ? 0xbfb5aa : 0xffffff)
      unit.image.setAlpha(enemy.hit ? 0.75 : 1)
      unit.health?.clear().fillStyle(0x2e2922).fillRoundedRect(-33, -48, 66, 8, 3)
        .fillStyle(enemy.hp / enemy.maxHp < 0.3 ? 0xef6658 : 0x97d56f)
        .fillRoundedRect(-31, -46, Math.max(0, 62 * enemy.hp / enemy.maxHp), 4, 2)
    }
  }

  private drawShots(shots: Shot[]) {
    const ids = new Set(shots.map((shot) => shot.id))
    for (const [id, image] of this.projectiles) if (!ids.has(id)) { image.destroy(); this.projectiles.delete(id) }
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
          if (!this.reduced) this.tweens.add({ targets: tower.image, scaleX: 0.8, scaleY: 0.8, duration: 75, yoyo: true })
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
      }
      let projectile = this.projectiles.get(shot.id)
      if (!projectile) {
        const texture = shot.kind === 'venom' ? 'bullet-frost' : shot.kind === 'storm' ? 'bullet-beam' : `bullet-${shot.kind}`
        projectile = fit(this.add.image(x, y, texture).setDepth(11), shot.kind === 'beam' || shot.kind === 'storm' ? 52 : shot.kind === 'cannon' ? 38 : 26)
        this.projectiles.set(shot.id, projectile)
      }
      projectile.setPosition(shot.kind === 'beam' ? to.x : x, shot.kind === 'beam' ? to.y : y)
        .setRotation(faceTarget(from, to) + Math.PI / 2).setAlpha(shot.kind === 'beam' ? 1 - progress : 1)
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
    backgroundColor: '#bc8a4d', transparent: false, render: { pixelArt: false, antialias: true },
    scale: { mode: Phaser.Scale.NONE }, scene: [scene], audio: { noAudio: true },
  })
  return { sync: (game, selected, paused, speed) => scene.sync(game, selected, paused, speed), destroy: () => renderer.destroy(true) }
}
