import { describe, it, expect } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import type { AlgorithmEvent } from '../../eventTypes'
import { applyCommands } from '../../SceneEngine'
import { compileEvent } from '../../eventCompiler'
import { createEmptyScene } from '../../types'
import type { SceneCell, SceneState } from '../../types'

const dummyScript = {
  algorithm: 'hash_table',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(n)' }, space: 'O(n)' },
  initialState: { type: 'array', data: [] },
  steps: [],
} as unknown as AnimationScript

/** Apply one event onto a scene and return the next scene. */
function step(scene: SceneState, event: AlgorithmEvent): SceneState {
  const commands = compileEvent(event, { scene, stepIndex: 0, script: dummyScript })
  return applyCommands(scene, commands)
}

function cell(scene: SceneState, id: string): SceneCell | undefined {
  const e = scene.entities[id]
  return e?.type === 'cell' ? e : undefined
}

describe('hashTableCompiler', () => {
  it('create 产出 capacity 个 hashbucket_ cell + 负载因子', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'hashtable.create', capacity: 8 })

    const buckets = Object.keys(scene.entities).filter(k => k.startsWith('hashbucket_'))
    expect(buckets).toHaveLength(8)
    expect(scene.entities['hashbucket_0']?.type).toBe('cell')

    const lf = cell(scene, 'hashtable_loadfactor')
    expect(lf?.value).toBe('0/8')
  })

  it('put 产出 hashentry_ cell 且 value 含 key:value', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'hashtable.create', capacity: 4 })
    scene = step(scene, { type: 'hashtable.put', key: 'a', value: 1, bucket: 2 })

    const entry = cell(scene, 'hashentry_2_0')
    expect(entry).toBeDefined()
    expect(entry?.value).toBe('a:1')
    expect((entry?.meta as { key?: string })?.key).toBe('a')

    const lf = cell(scene, 'hashtable_loadfactor')
    expect(lf?.value).toBe('1/4')
  })

  it('冲突 put 同 bucket 产出 chainIndex 递增的 entry', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'hashtable.create', capacity: 4 })
    scene = step(scene, { type: 'hashtable.put', key: 'a', value: 1, bucket: 1 })
    scene = step(scene, { type: 'hashtable.put', key: 'b', value: 2, bucket: 1, collision: true })
    scene = step(scene, { type: 'hashtable.put', key: 'c', value: 3, bucket: 1, collision: true })

    expect(cell(scene, 'hashentry_1_0')?.value).toBe('a:1')
    expect(cell(scene, 'hashentry_1_1')?.value).toBe('b:2')
    expect(cell(scene, 'hashentry_1_2')?.value).toBe('c:3')

    // chain entries share the same x (vertical chain), increasing y
    const e0 = cell(scene, 'hashentry_1_0')!
    const e1 = cell(scene, 'hashentry_1_1')!
    const e2 = cell(scene, 'hashentry_1_2')!
    expect(e0.position.x).toBe(e1.position.x)
    expect(e1.position.x).toBe(e2.position.x)
    expect(e1.position.y).toBeGreaterThan(e0.position.y)
    expect(e2.position.y).toBeGreaterThan(e1.position.y)

    expect(cell(scene, 'hashtable_loadfactor')?.value).toBe('3/4')
  })

  it('get found 高亮命中 entry；remove 标记删除并下一步清理', () => {
    let scene = createEmptyScene()
    scene = step(scene, { type: 'hashtable.create', capacity: 4 })
    scene = step(scene, { type: 'hashtable.put', key: 'x', value: 9, bucket: 3 })

    // get found
    scene = step(scene, { type: 'hashtable.get', key: 'x', bucket: 3, found: true })
    expect(scene.entities['hashentry_3_0']?.state?.role).toBe('visited')

    // remove marks deleted
    scene = step(scene, { type: 'hashtable.remove', key: 'x', bucket: 3 })
    expect(scene.entities['hashentry_3_0']?.state?.role).toBe('deleted')
    expect(cell(scene, 'hashtable_loadfactor')?.value).toBe('0/4')

    // a subsequent event triggers cleanup of the deleted entry
    scene = step(scene, { type: 'hashtable.highlight_bucket', bucket: 3 })
    expect(scene.entities['hashentry_3_0']).toBeUndefined()
  })
})
