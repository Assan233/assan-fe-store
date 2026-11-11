import type { EnemyKind, TowerKind } from './game'

const towers: Record<TowerKind, { metal: string; light: string; shape: string }> = {
  arrow: { metal: '#287d84', light: '#88ffdc', shape: '<path d="M48 83 57 26 70 16 79 26 88 83 70 103Z"/><path d="M38 81 43 34 52 26 58 33 58 84ZM82 84V33l6-7 9 9 5 46Z"/><path d="M62 24 70 6l8 18-8 12Z"/>' },
  frost: { metal: '#3974b0', light: '#a8efff', shape: '<path d="M70 7 82 39 108 70 82 84 70 113 58 84 31 70 58 39Z"/><path d="M70 24v77M44 70h52M50 50l40 40m0-40L50 90"/>' },
  cannon: { metal: '#9a5260', light: '#ffd093', shape: '<path d="M48 83V22l12-12h20l12 12v61L70 105Z"/><path d="M59 79V23h22v56Z"/><path d="m44 62-21-12-9 14 29 18m53-20 21-12 9 14-29 18"/>' },
  beam: { metal: '#62458c', light: '#efb2ff', shape: '<path d="m70 8 28 49-28 56-28-56Z"/><path d="m70 27 18 32-18 37-18-37Z"/><path d="M44 45 18 27l-8 31 34 13m52-26 26-18 8 31-34 13"/>' },
}

const enemies: Record<EnemyKind, { shell: string; light: string; shape: string }> = {
  runner: { shell: '#b2464f', light: '#ffba8e', shape: '<path d="m69 10 38 30-9 58-29 23-30-23-8-58Z"/><path d="M35 40 16 25l6 38 16 7m64-30 19-15-6 38-16 7M48 107l-18 24m60-24 18 24"/>' },
  swarm: { shell: '#a4752f', light: '#ffe393', shape: '<path d="M70 12 96 41l7 45-33 36-33-36 7-45Z"/><path d="M42 66 8 19l6 60 33 7m51-20 34-47-6 60-33 7"/>' },
  guard: { shell: '#57548b', light: '#c5bbf9', shape: '<path d="m70 6 43 23v70l-43 27-43-27V29Z"/><path d="M28 38 9 47v55l22 18m81-82 19 9v55l-22 18"/>' },
  boss: { shell: '#8c355b', light: '#ff84b8', shape: '<path d="m70 3 47 27 13 64-36 37H46L10 94l13-64Z"/><path d="M22 48 5 6l37 24m76 18 17-42-37 24M42 117l-19 20m75-20 19 20"/>' },
}

/** Generates self-contained, layered SVG textures for Phaser's WebGL and Canvas renderers. */
export function textureSvg(kind: TowerKind | EnemyKind): string {
  const tower = kind in towers
  const art = tower ? towers[kind as TowerKind] : enemies[kind as EnemyKind]
  const metal = tower ? (art as typeof towers.arrow).metal : (art as typeof enemies.runner).shell
  const light = art.light
  const shell = tower
    ? `<circle cx="70" cy="70" r="55" fill="#12243c" stroke="${light}" stroke-width="3"/><path d="m70 9 40 20 19 41-19 41-40 20-41-20L10 70l19-41Z" fill="${metal}" stroke="${light}" stroke-width="4"/><circle cx="70" cy="70" r="48" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2" stroke-dasharray="8 5"/><circle cx="70" cy="70" r="37" fill="#0b2039" stroke="${light}" stroke-width="5"/>`
    : `<circle cx="70" cy="70" r="58" fill="${light}" opacity=".12"/><path d="${kind === 'boss' ? 'M70 8 119 34 128 95 96 130H44L12 95l9-61Z' : 'M70 11 110 38 110 100 70 129 30 100 30 38Z'}" fill="#171c33" stroke="${light}" stroke-width="3"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><defs><radialGradient id="energy"><stop stop-color="#fff"/><stop offset=".38" stop-color="${light}"/><stop offset="1" stop-color="${metal}"/></radialGradient><linearGradient id="armor" x2=".9" y2="1"><stop stop-color="${light}"/><stop offset=".42" stop-color="${metal}"/><stop offset="1" stop-color="#18243d"/></linearGradient></defs>${shell}<g fill="url(#armor)" stroke="${light}" stroke-width="3" stroke-linejoin="round">${art.shape}</g><circle cx="70" cy="69" r="12" fill="url(#energy)" stroke="#fff" stroke-width="2"/><circle cx="70" cy="69" r="25" fill="none" stroke="${light}" stroke-width="2" stroke-dasharray="4 8" opacity=".85"/><path d="M28 110 18 120m94-10 10 10M28 29 18 19m94 10 10-10" stroke="${light}" stroke-width="3" opacity=".7"/></svg>`
}
