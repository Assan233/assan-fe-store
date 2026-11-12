import type { EnemyKind, TowerKind } from './game'

export const towerKinds = ['arrow', 'frost', 'cannon', 'beam'] as const satisfies readonly TowerKind[]
export const enemyKinds = ['runner', 'swarm', 'guard', 'boss'] as const satisfies readonly EnemyKind[]

export const terrainAssets = ['sand'] as const
export const effectAssets = ['bullet-arrow', 'bullet-frost', 'bullet-cannon', 'bullet-beam', 'fire'] as const

/** Returns a locally hosted painterly tower texture shared by the battlefield and UI. */
export function towerAsset(kind: TowerKind): string { return `${import.meta.env.BASE_URL}tower-defense/tower-${kind}.png` }

/** Returns a locally hosted monster portrait. */
export function enemyAsset(kind: EnemyKind): string { return `${import.meta.env.BASE_URL}tower-defense/enemy-${kind}.png` }

/** Returns the animated monster sprite sheet (ten 128-pixel square frames). */
export function enemyRunAsset(kind: EnemyKind): string { return `${import.meta.env.BASE_URL}tower-defense/enemy-${kind}-run.png` }

/** Returns a locally hosted map or effect texture. */
export function sceneAsset(name: typeof terrainAssets[number] | typeof effectAssets[number]): string {
  return `${import.meta.env.BASE_URL}tower-defense/${name}.${name === 'sand' ? 'webp' : 'png'}`
}
