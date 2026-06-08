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
})
