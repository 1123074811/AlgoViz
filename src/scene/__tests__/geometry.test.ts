import { describe, expect, it } from 'vitest'
import { deriveSceneState } from '../SceneEngine'
import { finalizeSceneGeometry, measureSceneGeometry, validateSceneGeometry } from '../geometry'
import { createEmptyScene } from '../types'
import { generateSkipList } from '../../presets/skipList'

describe('scene geometry contract', () => {
  it('measures and rejects overlapping nodes and labels', () => {
    const scene = createEmptyScene()
    scene.entities.a = { id: 'a', type: 'cell', position: { x: 100, y: 100 }, size: { width: 60, height: 40 }, value: 1 }
    scene.entities.b = { id: 'b', type: 'cell', position: { x: 120, y: 100 }, size: { width: 60, height: 40 }, value: 2 }
    expect(measureSceneGeometry(scene)).toHaveLength(2)
    expect(validateSceneGeometry(scene)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'overlap', ids: ['a', 'b'] }),
    ]))
  })

  it('persists an obstacle-free route and collision-aware label position', () => {
    const scene = createEmptyScene()
    scene.entities.a = { id: 'a', type: 'cell', position: { x: 80, y: 120 }, size: { width: 44, height: 44 }, value: 'A' }
    scene.entities.block = { id: 'block', type: 'cell', position: { x: 200, y: 120 }, size: { width: 70, height: 70 }, value: 'X' }
    scene.entities.b = { id: 'b', type: 'cell', position: { x: 320, y: 120 }, size: { width: 44, height: 44 }, value: 'B' }
    scene.edges.e = { id: 'e', type: 'edge', from: { entityId: 'a' }, to: { entityId: 'b' }, label: 'next' }

    const laidOut = finalizeSceneGeometry(scene)
    expect(laidOut.edges.e.route?.length).toBeGreaterThan(2)
    expect(laidOut.edges.e.labelPosition).toBeDefined()
    expect(validateSceneGeometry(laidOut).filter(item => item.type === 'edge-obstacle')).toEqual([])
  })

  it('keeps every skip-list cell and level label disjoint', () => {
    const script = generateSkipList([1, 3, 4, 7, 9, 12, 1000], 9)
    for (let step = 0; step <= script.steps.length; step++) {
      const scene = deriveSceneState(script, step)
      const violations = validateSceneGeometry(scene, 4).filter(item => item.type === 'overlap')
      expect(violations, `step ${step}: ${violations.map(item => item.message).join(', ')}`).toEqual([])
    }
  })
})
