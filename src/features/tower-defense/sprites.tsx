import type { EnemyKind, TowerKind } from './game'

/** Self-contained vector sprites used on the battlefield and in the tower shop. */
export function TowerSprite({ kind }: { kind: TowerKind }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={`td-sprite td-sprite-tower td-sprite-${kind}`}>
    <path d="M11 43 18 53h28l7-10-6-27H17Z" className="td-sprite-base" />
    <path d="M18 45h28M15 52h34M16 18 9 12m39 6 7-6" className="td-sprite-etch" />
    <circle cx="32" cy="33" r="18" className="td-sprite-rim" />
    <g className="td-sprite-head">
      {kind === 'arrow' && <><path d="m21 33 5-18h12l5 18-11 10Z" className="td-sprite-plating" /><path d="M27 31V8m10 23V8M32 28V6" className="td-sprite-barrel" /><path d="m27 21 5-5 5 5" className="td-sprite-etch" /><circle cx="32" cy="34" r="5" className="td-sprite-core" /></>}
      {kind === 'frost' && <><path d="m32 8 5 15 12 9-12 9-5 15-5-15-12-9 12-9Z" className="td-sprite-plating" /><path d="M32 11v41M16 32h32M21 21l22 22m0-22L21 43" className="td-sprite-barrel" /><circle cx="32" cy="32" r="7" className="td-sprite-core" /></>}
      {kind === 'cannon' && <><path d="M21 28V10q11-7 22 0v18l-6 8H27Z" className="td-sprite-plating" /><path d="M26 29V8h12v21" className="td-sprite-barrel" /><path d="M20 42 12 38l3-9 9 2m20 0 9-2 3 9-8 4" className="td-sprite-etch" /><circle cx="32" cy="32" r="8" className="td-sprite-core" /></>}
      {kind === 'beam' && <><path d="m32 7 13 23-13 22-13-22Z" className="td-sprite-plating" /><path d="m19 23-7-4-3 12 10 4m26-12 7-4 3 12-10 4M32 19V6" className="td-sprite-barrel" /><path d="m32 20 9 12-9 12-9-12Z" className="td-sprite-core" /></>}
    </g>
    <circle cx="32" cy="33" r="22" className="td-sprite-orbit" />
  </svg>
}

/** Enemy silhouettes distinguish movement, armor, swarms, and the wave boss. */
export function EnemySprite({ kind }: { kind: EnemyKind }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={`td-sprite td-sprite-enemy td-sprite-${kind}`}>
    {kind === 'runner' && <><path d="M16 41 9 53l16-5m23-7 7 12-16-5" className="td-creature-legs" /><path d="m32 5 18 16-3 25-15 10-15-10-3-25Z" className="td-creature-shell" /><path d="m32 5 6 19-6 12-6-12Zm-18 16 13 8-10 17m33-25-13 8 10 17" className="td-creature-plate" /><path d="m22 29 8 5m12-5-8 5" className="td-creature-eyes" /></>}
    {kind === 'swarm' && <><path d="M25 31 7 15l4 24 17 2m11-10 18-16-4 24-17 2" className="td-creature-wings" /><path d="m32 8 11 13 5 17-16 18-16-18 5-17Z" className="td-creature-shell" /><path d="M32 8v42M17 37l15-7 15 7" className="td-creature-plate" /><path d="m24 23 6 4m10-4-6 4" className="td-creature-eyes" /></>}
    {kind === 'guard' && <><path d="M13 16 5 22v26l13 9m33-41 8 6v26l-13 9" className="td-creature-legs" /><path d="m32 4 22 13v31L32 60 10 48V17Z" className="td-creature-shell" /><path d="M32 9v44M12 19l16 10-12 18m36-28L36 29l12 18M18 12l14 10 14-10" className="td-creature-plate" /><path d="m22 36 8-4m12 4-8-4" className="td-creature-eyes" /></>}
    {kind === 'boss' && <><path d="M13 18 4 10v24l13 8m34-24 9-8v24l-13 8M17 47 8 58m39-11 9 11" className="td-creature-legs" /><path d="M32 3 51 14l4 26-12 19H21L9 40l4-26Z" className="td-creature-shell" /><path d="m32 4 7 14-7 12-7-12Zm-19 11 13 9-10 16 8 17m27-42-13 9 10 16-8 17M21 48h22" className="td-creature-plate" /><path d="m19 29 10 4m16-4-10 4" className="td-creature-eyes" /><path d="M27 43h10" className="td-creature-mouth" /></>}
  </svg>
}
