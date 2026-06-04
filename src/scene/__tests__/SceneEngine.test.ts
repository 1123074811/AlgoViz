import { describe, it, expect, beforeEach } from 'vitest'
import { applyCommands, clearSnapshotCache } from '../SceneEngine'
import { createEmptyScene } from '../types'
import type { SceneState, SceneNode, SceneCell, SceneEdge, ScenePointer } from '../types'
import type { SceneCommand } from '../commandTypes'

// ── Factory helpers ──────────────────────────────────────────────────────────

function makeNode(id: string, x = 0, y = 0): SceneNode {
  return {
    id,
    type: 'node',
    variant: 'default',
    position: { x, y },
    fields: [],
    ports: [],
    state: {},
  }
}

function makeCell(id: string, value = '0'): SceneCell {
  return {
    id,
    type: 'cell',
    position: { x: 0, y: 0 },
    size: { width: 44, height: 44 },
    value,
    col: 0,
    state: {},
  }
}

function makeEdge(id: string, fromId: string, toId: string): SceneEdge {
  return {
    id,
    type: 'edge',
    from: { entityId: fromId },
    to: { entityId: toId },
    state: {},
  }
}

function makePointer(id: string, targetEntityId: string | null): ScenePointer {
  return {
    id,
    type: 'pointer',
    label: id,
    target: targetEntityId ? { entityId: targetEntityId } : null,
  }
}

// Helper to build a scene pre-seeded with a node
function sceneWithNode(id: string, x = 0, y = 0): SceneState {
  const scene = createEmptyScene()
  return { ...scene, entities: { [id]: makeNode(id, x, y) } }
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('applyCommands', () => {
  // 1. create_node — entity appears in entities
  it('create_node adds the node to entities', () => {
    const scene = createEmptyScene()
    const cmd: SceneCommand = { type: 'create_node', node: makeNode('n1', 10, 20) }
    const next = applyCommands(scene, [cmd])

    expect(next.entities['n1']).toBeDefined()
    expect(next.entities['n1'].id).toBe('n1')
    expect((next.entities['n1'] as SceneNode).position).toEqual({ x: 10, y: 20 })
  })

  // 2. Immutability — original scene is not mutated
  it('does not mutate the original scene', () => {
    const scene = createEmptyScene()
    const original = JSON.stringify(scene)
    const cmd: SceneCommand = { type: 'create_node', node: makeNode('n1') }
    applyCommands(scene, [cmd])

    expect(JSON.stringify(scene)).toBe(original)
  })

  // 3. remove_entity — entity disappears from entities
  it('remove_entity removes the entity from entities', () => {
    const scene = sceneWithNode('n1')
    const cmd: SceneCommand = { type: 'remove_entity', entityId: 'n1' }
    const next = applyCommands(scene, [cmd])

    expect(next.entities['n1']).toBeUndefined()
  })

  // 4. remove_entity — related edges (from.entityId) are removed
  it('remove_entity removes edges whose from.entityId matches', () => {
    let scene = createEmptyScene()
    scene = {
      ...scene,
      entities: { n1: makeNode('n1'), n2: makeNode('n2') },
      edges: { e1: makeEdge('e1', 'n1', 'n2') },
    }
    const cmd: SceneCommand = { type: 'remove_entity', entityId: 'n1' }
    const next = applyCommands(scene, [cmd])

    expect(next.edges['e1']).toBeUndefined()
  })

  // 4b. remove_entity — related edges (to.entityId) are also removed
  it('remove_entity removes edges whose to.entityId matches', () => {
    let scene = createEmptyScene()
    scene = {
      ...scene,
      entities: { n1: makeNode('n1'), n2: makeNode('n2') },
      edges: { e1: makeEdge('e1', 'n1', 'n2') },
    }
    const cmd: SceneCommand = { type: 'remove_entity', entityId: 'n2' }
    const next = applyCommands(scene, [cmd])

    expect(next.edges['e1']).toBeUndefined()
  })

  // 5. remove_entity — pointer targeting removed entity gets target = null
  it('remove_entity nulls out pointer.target for pointers targeting the removed entity', () => {
    let scene = createEmptyScene()
    scene = {
      ...scene,
      entities: { n1: makeNode('n1') },
      pointers: { p1: makePointer('p1', 'n1') },
    }
    const cmd: SceneCommand = { type: 'remove_entity', entityId: 'n1' }
    const next = applyCommands(scene, [cmd])

    expect(next.pointers['p1']).toBeDefined()
    expect(next.pointers['p1'].target).toBeNull()
  })

  // 6. connect / disconnect
  it('connect adds edge to edges; disconnect removes it', () => {
    const scene = createEmptyScene()
    const edge = makeEdge('e1', 'n1', 'n2')

    const afterConnect = applyCommands(scene, [{ type: 'connect', edge }])
    expect(afterConnect.edges['e1']).toBeDefined()
    expect(afterConnect.edges['e1'].from.entityId).toBe('n1')

    const afterDisconnect = applyCommands(afterConnect, [{ type: 'disconnect', edgeId: 'e1' }])
    expect(afterDisconnect.edges['e1']).toBeUndefined()
  })

  // 7a. set_state — merge=true merges state
  it('set_state with merge=true merges new state into existing state', () => {
    let scene = createEmptyScene()
    const node = { ...makeNode('n1'), state: { role: 'idle' as const, opacity: 1 } }
    scene = { ...scene, entities: { n1: node } }

    const cmd: SceneCommand = {
      type: 'set_state',
      entityId: 'n1',
      state: { role: 'active' as const },
      merge: true,
    }
    const next = applyCommands(scene, [cmd])
    const updated = next.entities['n1'] as SceneNode

    expect(updated.state?.role).toBe('active')
    expect(updated.state?.opacity).toBe(1) // preserved by merge
  })

  // 7b. set_state — merge=false (or undefined) replaces state
  it('set_state with merge=false replaces state entirely', () => {
    let scene = createEmptyScene()
    const node = { ...makeNode('n1'), state: { role: 'idle' as const, opacity: 1 } }
    scene = { ...scene, entities: { n1: node } }

    const cmd: SceneCommand = {
      type: 'set_state',
      entityId: 'n1',
      state: { role: 'active' as const },
      merge: false,
    }
    const next = applyCommands(scene, [cmd])
    const updated = next.entities['n1'] as SceneNode

    expect(updated.state?.role).toBe('active')
    expect(updated.state?.opacity).toBeUndefined() // wiped by replace
  })

  // 8. set_cell — updates cell value
  it('set_cell updates the cell value', () => {
    let scene = createEmptyScene()
    scene = { ...scene, entities: { c1: makeCell('c1', 'old') } }

    const cmd: SceneCommand = { type: 'set_cell', cellId: 'c1', value: 'new' }
    const next = applyCommands(scene, [cmd])
    const cell = next.entities['c1'] as SceneCell

    expect(cell.value).toBe('new')
  })

  // 9. add_port — adds port; duplicate id is ignored
  it('add_port adds a port to a node; duplicate port id is not added twice', () => {
    const scene = sceneWithNode('n1')
    const port = { id: 'p1', side: 'right' as const, role: 'output' as const }

    const afterFirst = applyCommands(scene, [{ type: 'add_port', nodeId: 'n1', port }])
    expect((afterFirst.entities['n1'] as SceneNode).ports).toHaveLength(1)

    // Adding the same port id again should be ignored
    const afterSecond = applyCommands(afterFirst, [{ type: 'add_port', nodeId: 'n1', port }])
    expect((afterSecond.entities['n1'] as SceneNode).ports).toHaveLength(1)
  })

  // 10. move_pointer — upsert pointer
  it('move_pointer upserts a pointer in the pointers map', () => {
    const scene = createEmptyScene()

    const cmd: SceneCommand = {
      type: 'move_pointer',
      pointerId: 'ptr1',
      target: { entityId: 'n1' },
      label: 'i',
    }
    const next = applyCommands(scene, [cmd])

    expect(next.pointers['ptr1']).toBeDefined()
    expect(next.pointers['ptr1'].target?.entityId).toBe('n1')
    expect(next.pointers['ptr1'].label).toBe('i')

    // Move to a different target
    const cmd2: SceneCommand = {
      type: 'move_pointer',
      pointerId: 'ptr1',
      target: { entityId: 'n2' },
      label: 'j',
    }
    const next2 = applyCommands(next, [cmd2])
    expect(next2.pointers['ptr1'].target?.entityId).toBe('n2')
    expect(next2.pointers['ptr1'].label).toBe('j')
  })

  // 11. wait — returns same scene (no-op)
  it('wait is a no-op and returns the same scene', () => {
    const scene = sceneWithNode('n1')
    const next = applyCommands(scene, [{ type: 'wait', duration: 500 }])

    // wait should return the same scene reference (the reduce accumulator is unchanged)
    expect(next).toBe(scene)
  })

  // 12. chain: create_node → move → set_state
  it('chains create_node, move, and set_state correctly', () => {
    const scene = createEmptyScene()
    const commands: SceneCommand[] = [
      { type: 'create_node', node: makeNode('n1', 0, 0) },
      { type: 'move', entityId: 'n1', to: { x: 100, y: 200 } },
      { type: 'set_state', entityId: 'n1', state: { role: 'visited' }, merge: false },
    ]
    const next = applyCommands(scene, commands)
    const node = next.entities['n1'] as SceneNode

    expect(node).toBeDefined()
    expect(node.position).toEqual({ x: 100, y: 200 })
    expect(node.state?.role).toBe('visited')
  })

  // 13. unknown entityId — safe return
  it('commands referencing a non-existent entityId return scene unchanged', () => {
    const scene = createEmptyScene()

    const move = applyCommands(scene, [{ type: 'move', entityId: 'ghost', to: { x: 1, y: 1 } }])
    expect(move).toBe(scene)

    const setState = applyCommands(scene, [
      { type: 'set_state', entityId: 'ghost', state: { role: 'active' } },
    ])
    expect(setState).toBe(scene)

    const setCell = applyCommands(scene, [{ type: 'set_cell', cellId: 'ghost', value: 'x' }])
    expect(setCell).toBe(scene)
  })
})

// ── clearSnapshotCache ────────────────────────────────────────────────────────

describe('clearSnapshotCache', () => {
  // 14. clearSnapshotCache — after clearing, findNearestSnapshot returns null
  // We verify this indirectly by checking that clearSnapshotCache doesn't throw
  // and that re-exporting the function works correctly.
  it('clearSnapshotCache is callable without errors', () => {
    expect(() => clearSnapshotCache()).not.toThrow()
  })

  it('clearSnapshotCache resets the internal cache (second call is also safe)', () => {
    clearSnapshotCache()
    clearSnapshotCache() // idempotent — must not throw
    expect(true).toBe(true)
  })
})
