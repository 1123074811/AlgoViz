import { describe, expect, it } from 'vitest'
import { deriveSceneState } from '@/scene'
import { generateUnionFind } from '../unionFind'

function cellValue(scene: ReturnType<typeof deriveSceneState>, id: string) {
  const entity = scene.entities[id]
  return entity?.type === 'cell' ? entity.value : undefined
}

describe('generateUnionFind', () => {
  it('uses dedicated union_find events instead of borrowing tree events', () => {
    const script = generateUnionFind([[0, 1], [1, 2]])
    const eventTypes = script.steps.flatMap(step => step.events ?? []).map(event => event.type)

    expect(script.presentation).toMatchObject({ engine: 'scene', module: 'union_find' })
    expect(script.initialState.type).toBe('union_find')
    expect(eventTypes.some(type => type.startsWith('union_find.'))).toBe(true)
    expect(eventTypes.some(type => type.startsWith('tree.'))).toBe(false)
  })

  it('updates the visible parent/rank arrays and parent-pointer edges', () => {
    const script = generateUnionFind([[0, 1], [1, 2], [3, 4], [4, 5], [2, 4]])
    const scene = deriveSceneState(script, script.steps.length)

    expect(cellValue(scene, 'uf_parent_0')).toBe(0)
    expect(cellValue(scene, 'uf_parent_1')).toBe(0)
    expect(cellValue(scene, 'uf_parent_2')).toBe(0)
    expect(cellValue(scene, 'uf_parent_3')).toBe(0)
    expect(cellValue(scene, 'uf_parent_4')).toBe(3)
    expect(cellValue(scene, 'uf_parent_5')).toBe(3)
    expect(cellValue(scene, 'uf_rank_0')).toBe(2)
    expect(scene.edges.uf_edge_1?.to.entityId).toBe('uf_0')
    expect(scene.edges.uf_edge_3?.to.entityId).toBe('uf_0')
    expect(scene.edges.uf_edge_4?.to.entityId).toBe('uf_3')
    expect(Object.keys(scene.entities).some(id => id.startsWith('arr_'))).toBe(false)

    const nodeYs = Object.entries(scene.entities)
      .filter(([id, entity]) => /^uf_\d+$/.test(id) && entity.type === 'node')
      .map(([_id, entity]) => entity.type === 'node' ? entity.position.y : 0)
    expect(new Set(nodeYs).size).toBeGreaterThan(1)
  })
})
