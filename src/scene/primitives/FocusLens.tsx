import { FOCUS } from '../tokens'
import { LENS_TRANSITION } from './sharedMotion'
import type { SceneEntity } from '../types'

/**
 * 在场景实体中挑出「当前正在访问」的元素中心,供聚焦光斑跟随。
 * 只看 node/cell,role 为 current/active;current 优先于 active(两趟遍历)。
 * 无匹配返回 null。
 */
export function pickFocusTarget(entities: SceneEntity[]): { x: number; y: number } | null {
  const isTarget = (e: SceneEntity): e is Extract<SceneEntity, { position: { x: number; y: number } }> =>
    (e.type === 'node' || e.type === 'cell') && 'position' in e && !!e.position

  for (const e of entities) {
    if (isTarget(e) && e.state?.role === 'current') {
      return { x: e.position.x, y: e.position.y }
    }
  }
  for (const e of entities) {
    if (isTarget(e) && e.state?.role === 'active') {
      return { x: e.position.x, y: e.position.y }
    }
  }
  return null
}

/**
 * 聚焦光斑(对齐 demo .focusdot):一个半透明大圆,平滑跟随当前元素中心;
 * 无当前元素时 opacity 0。画在实体层之下,被节点/边盖住。
 */
export default function FocusLens({ entities }: { entities: SceneEntity[] }) {
  const t = pickFocusTarget(entities)
  return (
    <circle
      className="scene-focus"
      r={FOCUS.radius}
      fill={FOCUS.fill}
      cx={t?.x ?? 0}
      cy={t?.y ?? 0}
      style={{ transition: LENS_TRANSITION, opacity: t ? 1 : 0 }}
      pointerEvents="none"
    />
  )
}
