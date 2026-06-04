import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'string',
  complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(nm)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function strCells(scene: SceneState): SceneCell[] {
  return Object.keys(scene.entities)
    .filter(k => /^s_\d+_\d+$/.test(k))
    .map(k => scene.entities[k])
    .filter((e): e is SceneCell => e?.type === 'cell')
}

function cell(scene: SceneState, row: number, index: number): SceneCell | undefined {
  const e = scene.entities[`s_${row}_${index}`]
  return e?.type === 'cell' ? e : undefined
}

describe('stringCompiler', () => {
  it('create 为每个字符产出一个 s_ cell（带下标 col）', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'string.create', text: 'abc' })

    const cells = strCells(scene)
    expect(cells).toHaveLength(3)
    expect(cell(scene, 0, 0)?.value).toBe('a')
    expect(cell(scene, 0, 1)?.value).toBe('b')
    expect(cell(scene, 0, 2)?.value).toBe('c')
    expect(cell(scene, 0, 2)?.col).toBe(2)
  })

  it('create_double 产出 text(row 0) 与 pattern(row 1) 两行', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'string.create_double', text: 'aab', pattern: 'ab' })

    expect(cell(scene, 0, 0)?.value).toBe('a')
    expect(cell(scene, 0, 2)?.value).toBe('b')
    expect(cell(scene, 1, 0)?.value).toBe('a')
    expect(cell(scene, 1, 1)?.value).toBe('b')
    expect(strCells(scene)).toHaveLength(5)
  })

  it('compare 把两个下标处的字符标为 comparing/warning 并脉冲', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'string.create', text: 'abcd' })
    scene = step(scene, { type: 'string.compare', row: 0, indices: [0, 3] })

    expect(cell(scene, 0, 0)?.state?.role).toBe('comparing')
    expect(cell(scene, 0, 0)?.state?.color).toBe('warning')
    expect(cell(scene, 0, 3)?.state?.pulse).toBe(true)
  })

  it('match 标 safe/success，mismatch 标 conflict/danger', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'string.create', text: 'abc' })

    scene = step(scene, { type: 'string.match', row: 0, index: 0 })
    expect(cell(scene, 0, 0)?.state?.role).toBe('safe')
    expect(cell(scene, 0, 0)?.state?.color).toBe('success')

    scene = step(scene, { type: 'string.mismatch', row: 0, index: 1 })
    expect(cell(scene, 0, 1)?.state?.role).toBe('conflict')
    expect(cell(scene, 0, 1)?.state?.color).toBe('danger')
  })

  it('mark_range 把一段下标标为结果区间', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'string.create', text: 'abcba' })
    scene = step(scene, { type: 'string.mark_range', row: 0, indices: [1, 2, 3] })

    for (const i of [1, 2, 3]) {
      expect(cell(scene, 0, i)?.state?.role).toBe('sorted')
    }
    expect(cell(scene, 0, 0)?.state?.role).not.toBe('sorted')
  })
})
