import type { SceneState, SceneEntity, SceneCell } from './types'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** 交叉弧线最大抬升高度（像素，场景坐标）。让互换的两个元素一上一下错开、不重叠。 */
const SWAP_ARC = 30

/**
 * 检测 prev→next 之间的「值互换」对：同 id 仍在原位、但 i 与 j 的值互相交换
 * （prev[i]==next[j] 且 prev[j]==next[i]）。数组排序的 swap 是「位置固定、交换数值」，
 * 没有位置变化可补间，必须靠这里识别出来再渲染成位置交叉动画。
 * 返回成对的 [idA, idB]。
 */
function findValueSwaps(prev: SceneState, next: SceneState): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  const used = new Set<string>()
  const ids = Object.keys(next.entities).filter(
    (id) => prev.entities[id] && isCell(next.entities[id]) && isCell(prev.entities[id]),
  )
  for (const id of ids) {
    if (used.has(id)) continue
    const pi = prev.entities[id] as SceneCell
    const ni = next.entities[id] as SceneCell
    if (pi.value === ni.value) continue // 值没变，不是互换的一端
    for (const jd of ids) {
      if (jd === id || used.has(jd)) continue
      const pj = prev.entities[jd] as SceneCell
      const nj = next.entities[jd] as SceneCell
      // i 的旧值跑到了 j 的新值、j 的旧值跑到了 i 的新值，且两值不同
      if (pi.value === nj.value && pj.value === ni.value && pi.value !== pj.value) {
        pairs.push([id, jd])
        used.add(id)
        used.add(jd)
        break
      }
    }
  }
  return pairs
}

function isCell(e: SceneEntity | undefined): e is SceneCell {
  return !!e && e.type === 'cell'
}

/**
 * 产出 prev→next 在进度 t∈[0,1] 的中间态 SceneState。
 * 不变量：t=1 时逐实体等于 next；t=0 时位置取自 prev。
 *
 * 处理三类变化：
 * 1. 值互换对（swap）：渲染成带弧线的位置交叉——A 携带其原值从 posA 划向 posB，
 *    B 反向。t=1 时两端值正好落在对方原位，与 next 视觉一致（无跳变）。
 * 2. 同 id 位置/透明度变化：线性插值。
 * 3. 新增实体淡入、移除实体淡出。
 * 其余字段（value/state/size 等）直接取 next（离散切换，避免脏色/脏值）。
 */
export function interpolateScene(prev: SceneState, next: SceneState, t: number): SceneState {
  if (t >= 1) return next

  const swaps = findValueSwaps(prev, next)
  const swapIds = new Set<string>()
  for (const [a, b] of swaps) {
    swapIds.add(a)
    swapIds.add(b)
  }

  const entities: Record<string, SceneEntity> = {}

  // 1. 值互换对：交叉弧线动画
  const arc = -Math.sin(Math.PI * t) * SWAP_ARC
  for (const [idA, idB] of swaps) {
    const pa = prev.entities[idA] as SceneCell
    const pb = prev.entities[idB] as SceneCell
    const na = next.entities[idA] as SceneCell
    const nb = next.entities[idB] as SceneCell
    const posA = na.position
    const posB = nb.position
    // A 携带原值划向 B 的位置，向上拱起；B 携带原值划向 A 的位置，向下沉。
    entities[idA] = {
      ...na,
      value: pa.value,
      position: { x: lerp(posA.x, posB.x, t), y: lerp(posA.y, posB.y, t) + arc },
    }
    entities[idB] = {
      ...nb,
      value: pb.value,
      position: { x: lerp(posB.x, posA.x, t), y: lerp(posB.y, posA.y, t) - arc },
    }
  }

  // 2. 其余同 id 实体：位置/透明度插值
  for (const [id, nextEnt] of Object.entries(next.entities)) {
    if (swapIds.has(id)) continue
    const prevEnt = prev.entities[id]
    if (prevEnt && 'position' in prevEnt && 'position' in nextEnt && prevEnt.position && nextEnt.position) {
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

  // 3. prev 有、next 无：淡出（仅 t<1 时存在）
  for (const [id, prevEnt] of Object.entries(prev.entities)) {
    if (!next.entities[id] && !swapIds.has(id) && 'position' in prevEnt) {
      entities[id] = { ...prevEnt, state: { ...prevEnt.state, opacity: (1 - t) * (prevEnt.state?.opacity ?? 1) } } as SceneEntity
    }
  }

  // 其余子图（edges/pointers/labels/groups/overlays/notes）整体取 next
  return { ...next, entities }
}
