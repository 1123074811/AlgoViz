import { describe, it, expect } from 'vitest'
import { cloneScene } from '../SceneEngine'
import { createEmptyScene } from '../types'
import type { SceneState } from '../types'

function sampleScene(): SceneState {
  const scene = createEmptyScene()
  scene.entities['n1'] = {
    type: 'node', id: 'n1', variant: 'graph.node',
    position: { x: 1, y: 2 }, size: { width: 48, height: 48 },
    ports: [{ id: 'c', side: 'top' }],
    fields: [{ id: 'f', value: 7 }],
    state: { role: 'active', color: 'primary' },
  } as SceneState['entities'][string]
  scene.edges['e1'] = {
    type: 'edge', id: 'e1',
    from: { entityId: 'n1' }, to: { entityId: 'n1' },
    variant: 'tree', directed: false,
  } as SceneState['edges'][string]
  scene.notes = ['hello']
  return scene
}

describe('cloneScene', () => {
  it('深拷贝：改克隆不影响原对象', () => {
    const orig = sampleScene()
    const copy = cloneScene(orig)
    ;(copy.entities['n1'] as { position: { x: number } }).position.x = 999
    ;(copy.entities['n1'] as { fields: { value: number }[] }).fields[0].value = -1
    copy.notes!.push('mutated')
    expect((orig.entities['n1'] as { position: { x: number } }).position.x).toBe(1)
    expect((orig.entities['n1'] as { fields: { value: number }[] }).fields[0].value).toBe(7)
    expect(orig.notes).toEqual(['hello'])
  })

  it('结构等价：克隆与原对象深相等', () => {
    const orig = sampleScene()
    expect(cloneScene(orig)).toEqual(orig)
  })

  it('嵌套引用断开：克隆的内层对象不是同一引用', () => {
    const orig = sampleScene()
    const copy = cloneScene(orig)
    expect(copy.entities['n1']).not.toBe(orig.entities['n1'])
    expect((copy.entities['n1'] as { ports: unknown[] }).ports)
      .not.toBe((orig.entities['n1'] as { ports: unknown[] }).ports)
  })
})
