import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'gan', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'graph', data: [], nodes: [], edges: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('graphAnalysisCompiler', () => {
  it('update 把模型累积到 gan_marker.meta', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'graph_analysis.update', discLow: { A: [1, 1] }, stack: ['A'] })
    scene = step(scene, { type: 'graph_analysis.update', components: { A: 0 } })
    const marker = scene.entities['gan_marker'] as SceneCell
    const model = marker.meta as { discLow: Record<string, [number, number]>; stack: string[]; components: Record<string, number> }
    expect(model.discLow.A).toEqual([1, 1])
    expect(model.stack).toEqual(['A'])
    expect(model.components.A).toBe(0) // 后一次 update 合并保留前者
  })

  it('clear 移除标记', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'graph_analysis.update', stack: ['A'] })
    scene = step(scene, { type: 'graph_analysis.clear' })
    expect(scene.entities['gan_marker']).toBeUndefined()
  })
})
