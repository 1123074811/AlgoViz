import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'prob', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('probCompiler', () => {
  it('dist 为每个 bin 产出 prob_bin_<i> cell,meta 存 weight', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.dist', bins: [{ label: 'a', weight: 1 }, { label: 'b', weight: 3 }] })
    expect((scene.entities['prob_bin_0'] as SceneCell)?.type).toBe('cell')
    expect(((scene.entities['prob_bin_1'] as SceneCell).meta as { weight?: number }).weight).toBe(3)
  })

  it('sample 高亮选中 bin', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.dist', bins: [{ label: 'a', weight: 1 }, { label: 'b', weight: 2 }] })
    scene = step(scene, { type: 'prob.sample', index: 1 })
    expect((scene.entities['prob_bin_1'] as SceneCell).state?.pulse).toBe(true)
  })

  it('reservoir 产出 prob_res_<i> 槽位', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'prob.reservoir', capacity: 2, items: [7, 9] })
    expect((scene.entities['prob_res_0'] as SceneCell)?.value).toBe('7')
    expect((scene.entities['prob_res_1'] as SceneCell)?.value).toBe('9')
  })
})
