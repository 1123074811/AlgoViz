import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'gcd',
  complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
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

describe('mathCompiler', () => {
  it('init 产出每个变量一个 mathvar_ cell', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'math.init', vars: [{ name: 'a', value: 48 }, { name: 'b', value: 18 }] })

    const vars = Object.keys(scene.entities).filter(k => k.startsWith('mathvar_'))
    expect(vars).toHaveLength(2)

    const a = cell(scene, 'mathvar_a')
    // Cell shows only the value; the name lives in meta (VariablesView draws it above).
    expect(a?.value).toBe('48')
    expect((a?.meta as { name?: string })?.name).toBe('a')
    expect((a?.meta as { value?: number })?.value).toBe(48)

    expect(cell(scene, 'mathvar_b')?.value).toBe('18')

    // horizontally packed: b sits to the right of a
    expect(cell(scene, 'mathvar_b')!.position.x).toBeGreaterThan(cell(scene, 'mathvar_a')!.position.x)
  })

  it('set 更新已存在变量的 value 与 meta', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'math.init', vars: [{ name: 'a', value: 48 }, { name: 'b', value: 18 }] })
    scene = step(scene, { type: 'math.set', name: 'a', value: 18 })

    const a = cell(scene, 'mathvar_a')
    expect(a?.value).toBe('18')
    expect((a?.meta as { value?: number })?.value).toBe(18)
    expect(a?.state?.pulse).toBe(true)

    // still only two variables
    expect(Object.keys(scene.entities).filter(k => k.startsWith('mathvar_'))).toHaveLength(2)
  })

  it('set 一个新变量名会自动创建一格', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'math.init', vars: [{ name: 'a', value: 48 }, { name: 'b', value: 18 }] })
    scene = step(scene, { type: 'math.set', name: 'r', value: 12 })

    expect(Object.keys(scene.entities).filter(k => k.startsWith('mathvar_'))).toHaveLength(3)
    const r = cell(scene, 'mathvar_r')
    expect(r?.value).toBe('12')
    // appended to the right of b
    expect(r!.position.x).toBeGreaterThan(cell(scene, 'mathvar_b')!.position.x)
  })

  it('highlight 设 current + pulse 且不改值；note 发 scene note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'math.init', vars: [{ name: 'a', value: 48 }] })
    scene = step(scene, { type: 'math.highlight', name: 'a' })

    const a = cell(scene, 'mathvar_a')
    expect(a?.value).toBe('48')
    expect(a?.state?.role).toBe('current')
    expect(a?.state?.pulse).toBe(true)

    scene = step(scene, { type: 'math.note', text: '辗转相除' })
    expect(scene.notes?.[scene.notes.length - 1]).toBe('辗转相除')
  })
})
