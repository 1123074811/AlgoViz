import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { dequeCompiler } from '../dequeCompiler'
import { dequeCellId } from '../dequeCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'deque',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = dequeCompiler.compile(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function cell(scene: SceneState, id: string): SceneCell | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e : undefined
}

function dequeIds(scene: SceneState): string[] {
  return Object.keys(scene.entities).filter(k => /^deque_\d+$/.test(k))
}

describe('dequeCompiler', () => {
  it('create 产出 deque_<i> 单元并居中布局', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [1, 2, 3] })

    expect(dequeIds(scene)).toHaveLength(3)
    expect(cell(scene, 'deque_0')?.value).toBe(1)
    expect(cell(scene, 'deque_2')?.value).toBe(3)
    // 单元按索引从左到右等距排列
    const x0 = cell(scene, 'deque_0')!.position.x
    const x1 = cell(scene, 'deque_1')!.position.x
    const x2 = cell(scene, 'deque_2')!.position.x
    expect(x1).toBeGreaterThan(x0)
    expect(x2 - x1).toBeCloseTo(x1 - x0)
  })

  it('push_back 追加到末尾索引并写 note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [1, 2] })
    scene = step(scene, { type: 'deque.push_back', value: 9 })

    expect(cell(scene, 'deque_2')?.value).toBe(9)
    expect(cell(scene, 'deque_2')?.state?.role).toBe('inserted')
    expect(scene.notes).toContain('push_back(9)')
  })

  it('push_front 也追加到末尾索引（新建单元 id）并写 note', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [5] })
    scene = step(scene, { type: 'deque.push_front', value: 7 })

    expect(dequeIds(scene)).toHaveLength(2)
    expect(cell(scene, 'deque_1')?.value).toBe(7)
    expect(scene.notes).toContain('push_front(7)')
  })

  it('连续 push 后 phantom 单元在下一步被清理', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [1] })
    scene = step(scene, { type: 'deque.push_back', value: 2 })
    // push 这一步产生了 phantom_back_*
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_'))).toBe(true)
    // 下一步清理 phantom
    scene = step(scene, { type: 'deque.push_back', value: 3 })
    expect(Object.keys(scene.entities).some(k => k.startsWith('phantom_back_1'))).toBe(false)
  })

  it('pop_front 标记队首为 deleted，写出弹出值，下一步移除', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [10, 20, 30] })
    scene = step(scene, { type: 'deque.pop_front' })

    expect(cell(scene, 'deque_0')?.state?.role).toBe('deleted')
    expect(scene.notes).toContain('pop_front() → 10')

    // 下一个事件触发清理：deleted 单元被移除
    scene = step(scene, { type: 'deque.peek_back', index: 2 })
    expect(scene.entities['deque_0']).toBeUndefined()
  })

  it('pop_back 标记队尾为 deleted 并写出弹出值', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [10, 20, 30] })
    scene = step(scene, { type: 'deque.pop_back' })

    expect(cell(scene, 'deque_2')?.state?.role).toBe('deleted')
    expect(scene.notes).toContain('pop_back() → 30')
  })

  it('pop_front / pop_back 空队列写 empty note', () => {
    let scene = createEmptyScene()
    let s1 = step(scene, { type: 'deque.pop_front' })
    expect(s1.notes).toContain('pop_front() → empty')
    let s2 = step(scene, { type: 'deque.pop_back' })
    expect(s2.notes).toContain('pop_back() → empty')
  })

  it('peek_front / peek_back 高亮目标单元为 current', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'deque.create', values: [1, 2, 3] })
    scene = step(scene, { type: 'deque.peek_front', index: 0 })
    expect(cell(scene, 'deque_0')?.state?.role).toBe('current')

    scene = step(scene, { type: 'deque.peek_back', index: 2 })
    expect(cell(scene, 'deque_2')?.state?.role).toBe('current')
  })

  it('dequeCellId 生成稳定 id', () => {
    expect(dequeCellId(4)).toBe('deque_4')
  })
})
