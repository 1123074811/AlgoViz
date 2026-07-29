import { describe, expect, it } from 'vitest'
import { deriveSceneState } from '../SceneEngine'
import { finalizeSceneGeometry, measureSceneGeometry, validateSceneGeometry } from '../geometry'
import { createEmptyScene, type SceneCell } from '../types'
import { generateBinaryTree } from '../../presets/binaryTree'
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

  it('refits preserved directed routes and leaves room for the arrowhead', () => {
    const scene = createEmptyScene()
    scene.entities.a = { id: 'a', type: 'cell', position: { x: 80, y: 120 }, size: { width: 44, height: 44 }, value: 'A' }
    scene.entities.b = { id: 'b', type: 'cell', position: { x: 320, y: 120 }, size: { width: 44, height: 44 }, value: 'B' }
    scene.edges.e = {
      id: 'e',
      type: 'edge',
      from: { entityId: 'a' },
      to: { entityId: 'b' },
      directed: true,
      route: [{ x: 102, y: 120 }, { x: 320, y: 120 }],
    }

    const route = finalizeSceneGeometry(scene, true).edges.e.route!
    expect(route[route.length - 1]?.x).toBeLessThanOrEqual(288)
  })

  it('clips B/B+ tree arrows against rectangular multi-key nodes', () => {
    const scene = createEmptyScene()
    scene.entities.root = {
      id: 'root', type: 'node', variant: 'tree.btree', position: { x: 100, y: 120 },
      size: { width: 96, height: 44 }, fields: [{ id: 'k0', value: 20 }], ports: [],
    }
    scene.entities.leaf = {
      id: 'leaf', type: 'node', variant: 'tree.btree', position: { x: 320, y: 120 },
      size: { width: 96, height: 44 }, fields: [{ id: 'k0', value: 40 }], ports: [],
    }
    scene.edges.e = {
      id: 'e', type: 'edge', from: { entityId: 'root' }, to: { entityId: 'leaf' },
      directed: true, route: [{ x: 148, y: 120 }, { x: 272, y: 120 }],
    }

    const route = finalizeSceneGeometry(scene, true).edges.e.route!
    expect(route[route.length - 1]?.x).toBeLessThanOrEqual(262)
  })

  it('keeps every skip-list cell and level label disjoint', () => {
    const script = generateSkipList([1, 3, 4, 7, 9, 12, 1000], 9)
    for (let step = 0; step <= script.steps.length; step++) {
      const scene = deriveSceneState(script, step)
      const violations = validateSceneGeometry(scene, 4).filter(item => item.type === 'overlap')
      expect(violations, `step ${step}: ${violations.map(item => item.message).join(', ')}`).toEqual([])
    }
  })

  it('continues placing output cells on the current row after wrapping', () => {
    const script = generateBinaryTree(Array.from({ length: 24 }, (_, index) => index + 1))
    const scene = deriveSceneState(script, script.steps.length)
    const sequence = Object.values(scene.entities)
      .filter((entity): entity is SceneCell => entity.type === 'cell' && entity.id.startsWith('seq_'))
    const rows = [...new Set(sequence.map(cell => cell.position.y))]

    expect(rows.length).toBeGreaterThan(1)
    expect(sequence.filter(cell => cell.position.y === rows[rows.length - 1])).toHaveLength(9)
  })

  it('rejects orphan tree nodes', () => {
    const scene = createEmptyScene()
    scene.entities.root = {
      id: 'root', type: 'node', variant: 'tree.binary', position: { x: 100, y: 80 },
      size: { width: 48, height: 48 }, fields: [], ports: [],
    }
    scene.entities.orphan = {
      id: 'orphan', type: 'node', variant: 'tree.binary', position: { x: 240, y: 200 },
      size: { width: 48, height: 48 }, fields: [], ports: [],
    }
    scene.pointers.root = { id: 'root-pointer', type: 'pointer', label: 'root', target: { entityId: 'root' } }

    expect(validateSceneGeometry(scene)).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'orphan', ids: ['orphan'] }),
    ]))
  })
})
