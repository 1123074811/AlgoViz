import type { SceneState, SceneEntity } from './types'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * 产出 prev→next 在进度 t∈[0,1] 的中间态 SceneState。
 * 不变量：t=1 时逐实体等于 next；t=0 时位置取自 prev。
 * 仅对「同 id 且都有 position」的实体插值位置与 opacity；
 * 其余字段（value/state/size 等）直接取 next（离散切换，避免脏色/脏值）。
 */
export function interpolateScene(prev: SceneState, next: SceneState, t: number): SceneState {
  if (t >= 1) return next
  const entities: Record<string, SceneEntity> = {}
  for (const [id, nextEnt] of Object.entries(next.entities)) {
    const prevEnt = prev.entities[id]
    if (prevEnt && 'position' in prevEnt && 'position' in nextEnt) {
      const pos = {
        x: lerp(prevEnt.position.x, nextEnt.position.x, t),
        y: lerp(prevEnt.position.y, nextEnt.position.y, t),
      }
      const prevOpacity = prevEnt.state?.opacity ?? 1
      const nextOpacity = nextEnt.state?.opacity ?? 1
      const opacity = lerp(prevOpacity, nextOpacity, t)
      entities[id] = {
        ...nextEnt,
        position: pos,
        state: { ...nextEnt.state, opacity },
      } as SceneEntity
    } else if (!prevEnt && 'position' in nextEnt) {
      // 新增实体：淡入
      entities[id] = { ...nextEnt, state: { ...nextEnt.state, opacity: t } } as SceneEntity
    } else {
      entities[id] = nextEnt
    }
  }
  // 其余子图（edges/pointers/labels/groups/overlays/notes）整体取 next
  return { ...next, entities }
}
