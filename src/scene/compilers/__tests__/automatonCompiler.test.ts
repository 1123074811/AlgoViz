import { describe, it, expect } from 'vitest'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import type { SceneState, SceneCell } from '../../types'

const dummy = { algorithm: 'auto', complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' }, initialState: { type: 'array', data: [] }, steps: [] } as unknown as AnimationScript
const step = (s: SceneState, e: AlgorithmEvent) => applyCommands(s, compileEvent(e, { scene: s, stepIndex: 0, script: dummy }))

describe('automatonCompiler', () => {
  it('create 产出 auto_<id> 状态,横向排列,start/accepting 写入 meta', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'automaton.create', states: [{ id: 's0', start: true }, { id: 's1', accepting: true }] })
    const s0 = scene.entities['auto_s0'] as SceneCell
    const s1 = scene.entities['auto_s1'] as SceneCell
    expect(s0?.type).toBe('cell')
    expect((s0.meta as { start?: boolean }).start).toBe(true)
    expect((s1.meta as { accepting?: boolean }).accepting).toBe(true)
    expect(s1.position.x).toBeGreaterThan(s0.position.x) // 横向链式
  })

  it('transition 产出 autoedge_ 边;activate 高亮当前态', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'automaton.create', states: [{ id: 's0' }, { id: 's1' }] })
    scene = step(scene, { type: 'automaton.transition', id: 't0', from: 's0', to: 's1', label: 'a' })
    expect(scene.edges['autoedge_t0']?.from.entityId).toBe('auto_s0')
    expect(scene.edges['autoedge_t0']?.to.entityId).toBe('auto_s1')
    scene = step(scene, { type: 'automaton.activate', stateId: 's1' })
    expect((scene.entities['auto_s1'] as SceneCell).state?.pulse).toBe(true)
  })
})
