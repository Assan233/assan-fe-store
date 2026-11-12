import type { EnemyKind, TowerKind } from './game'
import { enemyAsset, towerAsset } from './assets'

/** Shows the same locally hosted tower artwork as the Phaser battlefield. */
export function TowerSprite({ kind }: { kind: TowerKind }) {
  return <img className="td-sprite" src={towerAsset(kind)} alt="" aria-hidden="true" />
}

/** Shows the same locally hosted enemy artwork as the Phaser battlefield. */
export function EnemySprite({ kind }: { kind: EnemyKind }) {
  return <img className="td-sprite" src={enemyAsset(kind)} alt="" aria-hidden="true" />
}
