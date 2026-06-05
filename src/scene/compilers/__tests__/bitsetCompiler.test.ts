import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'bitset',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function cell(scene: SceneState, id: string): SceneCell | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e : undefined
}

function bitIds(scene: SceneState): string[] {
  return Object.keys(scene.entities).filter(k => /^bit_\d+$/.test(k))
}

describe('bitsetCompiler', () => {
  it('create 产出 bit_<i> 位格，全 0 初始', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'bitset.create', bits: 4, label: '子集' })

    const ids = bitIds(scene)
    expect(ids).toHaveLength(4)
    expect(cell(scene, 'bit_0')?.value).toBe(0)
    expect(cell(scene, 'bit_3')?.value).toBe(0)
    // 位格按下标横排，x 递增、y 相同
    expect(cell(scene, 'bit_1')!.position.x).toBeGreaterThan(cell(scene, 'bit_0')!.position.x)
    expect(cell(scene, 'bit_1')!.position.y).toBe(cell(scene, 'bit_0')!.position.y)
    // label marker 记录在隐藏标记格上
    expect((cell(scene, 'bitset_label')?.meta as { label?: string })?.label).toBe('子集')
  })

  it('set 更新某位的 value', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'bitset.create', bits: 4 })
    scene = step(scene, { type: 'bitset.set', index: 2, value: 1 })

    expect(cell(scene, 'bit_2')?.value).toBe(1)
    expect(cell(scene, 'bit_0')?.value).toBe(0)

    // 清回 0
    scene = step(scene, { type: 'bitset.set', index: 2, value: 0 })
    expect(cell(scene, 'bit_2')?.value).toBe(0)
  })

  it('set 越界不报错、不改其它位', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'bitset.create', bits: 3 })
    scene = step(scene, { type: 'bitset.set', index: 9, value: 1 })
    expect(bitIds(scene)).toHaveLength(3)
    expect(cell(scene, 'bit_0')?.value).toBe(0)
  })
})
