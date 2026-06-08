import { describe, it, expect } from 'vitest'
import { interpolateScene } from '../interpolate'
import { createEmptyScene } from '../types'
import type { SceneState, SceneCell } from '../types'

function sceneWithCell(id: string, x: number, y: number, opacity = 1): SceneState {
  const cell: SceneCell = {
    id, type: 'cell', position: { x, y }, size: { width: 44, height: 44 },
    value: '1', col: 0, state: { role: 'idle', color: 'muted', opacity },
  }
  return { ...createEmptyScene(), entities: { [id]: cell } }
}

describe('interpolateScene', () => {
  it('t=0 返回 prev 的位置', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 0)
    expect((mid.entities['arr_0'] as SceneCell).position).toEqual({ x: 0, y: 0 })
  })

  it('t=0.5 返回中点位置', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 0.5)
    expect((mid.entities['arr_0'] as SceneCell).position).toEqual({ x: 50, y: 25 })
  })

  it('t=1 逐实体等于 next（终态等价不变量）', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = sceneWithCell('arr_0', 100, 50)
    const mid = interpolateScene(prev, next, 1)
    expect(mid.entities['arr_0']).toEqual(next.entities['arr_0'])
  })

  it('prev 有、next 无的实体在中间帧保留并淡出，t=1 时消失', () => {
    const prev = sceneWithCell('arr_0', 0, 0)
    const next = createEmptyScene()
    const mid = interpolateScene(prev, next, 0.5)
    const ghost = mid.entities['arr_0'] as SceneCell
    expect(ghost).toBeDefined()
    expect(ghost.state?.opacity).toBeCloseTo(0.5)
    const end = interpolateScene(prev, next, 1)
    expect(end.entities['arr_0']).toBeUndefined()
  })

  it('随机多实体场景 t=1 整体等于 next（不变量守卫）', () => {
    const next = sceneWithCell('arr_0', 12, 34)
    ;(next.entities as Record<string, unknown>)['arr_1'] = {
      id: 'arr_1', type: 'cell', position: { x: 99, y: 7 }, size: { width: 44, height: 44 },
      value: '2', col: 1, state: { role: 'active', color: 'primary', opacity: 0.8 },
    }
    const prev = sceneWithCell('arr_0', 0, 0)
    expect(interpolateScene(prev, next, 1)).toEqual(next)
  })

  describe('值互换交叉动画', () => {
    // 构造一次 swap：位置固定，arr_0/arr_1 的值互换（5↔3）。
    function swapScenes() {
      const cell = (id: string, x: number, value: string): SceneCell => ({
        id, type: 'cell', position: { x, y: 0 }, size: { width: 44, height: 44 },
        value, col: 0, state: { role: 'idle', color: 'muted' },
      })
      const prev: SceneState = { ...createEmptyScene(), entities: { arr_0: cell('arr_0', 0, '5'), arr_1: cell('arr_1', 100, '3') } }
      const next: SceneState = { ...createEmptyScene(), entities: { arr_0: cell('arr_0', 0, '3'), arr_1: cell('arr_1', 100, '5') } }
      return { prev, next }
    }

    it('t=0.5 时两端携带原值并交叉到对方位置附近', () => {
      const { prev, next } = swapScenes()
      const mid = interpolateScene(prev, next, 0.5)
      const a = mid.entities['arr_0'] as SceneCell
      const b = mid.entities['arr_1'] as SceneCell
      // arr_0 携带原值 5，划向 arr_1 的位置（x 从 0→100 的中点 50）
      expect(a.value).toBe('5')
      expect(a.position.x).toBeCloseTo(50)
      // arr_1 携带原值 3，划向 arr_0 的位置
      expect(b.value).toBe('3')
      expect(b.position.x).toBeCloseTo(50)
      // 一上一下错开，y 不相等
      expect(a.position.y).not.toBeCloseTo(b.position.y)
    })

    it('t=1 精确等于 next（终态等价，索引模型不变）', () => {
      const { prev, next } = swapScenes()
      expect(interpolateScene(prev, next, 1)).toEqual(next)
    })
  })
})
