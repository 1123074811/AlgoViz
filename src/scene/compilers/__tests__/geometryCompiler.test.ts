import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'geo', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('geometryCompiler', () => {
  it('point 事件产出 geo_<id> cell,meta 存数据坐标', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'geometry.plane', xRange: [0, 10], yRange: [0, 10] })
    scene = step(scene, { type: 'geometry.point', id: 'A', x: 3, y: 4 })
    const cell = scene.entities['geo_A'] as SceneCell
    expect(cell?.type).toBe('cell')
    expect((cell.meta as { gx?: number; gy?: number }).gx).toBe(3)
    expect((cell.meta as { gy?: number }).gy).toBe(4)
  })

  it('clear 移除所有 geo_ 实体', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'geometry.plane', xRange: [0, 10], yRange: [0, 10] })
    scene = step(scene, { type: 'geometry.point', id: 'A', x: 1, y: 1 })
    scene = step(scene, { type: 'geometry.clear' })
    expect(Object.keys(scene.entities).filter(k => k.startsWith('geo_'))).toHaveLength(0)
  })
})
