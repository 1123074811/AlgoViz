import { describe, it, expect } from 'vitest'
import { applyCommands } from '@/scene'
import { createEmptyScene } from '../types'
import type {
  SceneState,
  SceneNode,
  SceneCell,
  SceneLabel,
  SceneGroup,
  ScenePointer,
  SceneEdge,
} from '../types'
import type { SceneCommand } from '../commandTypes'

// ── Factories ───────────────────────────────────────────────────────────────────

function makeNode(id: string, fields: SceneNode['fields'] = []): SceneNode {
  return { id, type: 'node', variant: 'default', position: { x: 0, y: 0 }, fields, ports: [], state: {} }
}

function makePointer(id: string, target: string | null): ScenePointer {
  return { id, type: 'pointer', label: id, target: target ? { entityId: target } : null, state: {} }
}

function makeLabel(id: string): SceneLabel {
  return { id, type: 'label', text: id, position: { x: 0, y: 0 }, state: {} }
}

function makeGroup(id: string): SceneGroup {
  return { id, type: 'group', entityIds: [], state: {} }
}

function makeEdge(id: string, from: string, to: string): SceneEdge {
  return { id, type: 'edge', from: { entityId: from }, to: { entityId: to }, state: {} }
}

// ── set_state on non-entity maps (pointers / labels / groups / edges) ─────────────

describe('applyCommands — set_state across all maps', () => {
  it('updates a pointer state', () => {
    let scene = createEmptyScene()
    scene = { ...scene, pointers: { p1: makePointer('p1', 'n1') } }
    const next = applyCommands(scene, [
      { type: 'set_state', entityId: 'p1', state: { role: 'active' }, merge: true },
    ])
    expect(next.pointers['p1'].state?.role).toBe('active')
  })

  it('updates a label state', () => {
    let scene = createEmptyScene()
    scene = { ...scene, labels: { l1: makeLabel('l1') } }
    const next = applyCommands(scene, [
      { type: 'set_state', entityId: 'l1', state: { color: 'danger' }, merge: false },
    ])
    expect(next.labels['l1'].state?.color).toBe('danger')
  })

  it('updates a group state', () => {
    let scene = createEmptyScene()
    scene = { ...scene, groups: { g1: makeGroup('g1') } }
    const next = applyCommands(scene, [
      { type: 'set_state', entityId: 'g1', state: { role: 'window' }, merge: true },
    ])
    expect(next.groups['g1'].state?.role).toBe('window')
  })

  it('also updates an edge state when an edge shares the entity id', () => {
    let scene: SceneState = createEmptyScene()
    scene = {
      ...scene,
      entities: { e1: makeNode('e1') },
      edges: { e1: makeEdge('e1', 'a', 'b') },
    }
    const next = applyCommands(scene, [
      { type: 'set_state', entityId: 'e1', state: { color: 'success' }, merge: true },
    ])
    expect(next.edges['e1'].state?.color).toBe('success')
    expect((next.entities['e1'] as SceneNode).state?.color).toBe('success')
  })
})

// ── set_field / set_fields ────────────────────────────────────────────────────────

describe('applyCommands — set_field / set_fields', () => {
  it('set_field updates a single matching field', () => {
    const node = makeNode('n1', [
      { id: 'f1', value: 'a' },
      { id: 'f2', value: 'b' },
    ])
    let scene = createEmptyScene()
    scene = { ...scene, entities: { n1: node } }
    const next = applyCommands(scene, [
      { type: 'set_field', nodeId: 'n1', fieldId: 'f2', field: { value: 'updated' } },
    ])
    const fields = (next.entities['n1'] as SceneNode).fields
    expect(fields.find((f) => f.id === 'f2')?.value).toBe('updated')
    expect(fields.find((f) => f.id === 'f1')?.value).toBe('a')
  })

  it('set_field is a no-op on a non-node entity', () => {
    const cell: SceneCell = { id: 'c1', type: 'cell', position: { x: 0, y: 0 }, value: '1', col: 0, state: {} }
    let scene = createEmptyScene()
    scene = { ...scene, entities: { c1: cell } }
    const next = applyCommands(scene, [
      { type: 'set_field', nodeId: 'c1', fieldId: 'f', field: { value: 'x' } },
    ])
    expect(next).toBe(scene)
  })

  it('set_fields replaces the whole field list', () => {
    const node = makeNode('n1', [{ id: 'f1', value: 'a' }])
    let scene = createEmptyScene()
    scene = { ...scene, entities: { n1: node } }
    const next = applyCommands(scene, [
      { type: 'set_fields', nodeId: 'n1', fields: [{ id: 'x', value: '1' }, { id: 'y', value: '2' }] },
    ])
    const fields = (next.entities['n1'] as SceneNode).fields
    expect(fields).toHaveLength(2)
    expect(fields[1].id).toBe('y')
  })

  it('set_fields is a no-op on a missing node', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [{ type: 'set_fields', nodeId: 'ghost', fields: [] }])
    expect(next).toBe(scene)
  })
})

// ── add_port / remove_port ────────────────────────────────────────────────────────

describe('applyCommands — ports', () => {
  it('remove_port removes a matching port', () => {
    let scene = createEmptyScene()
    const node = { ...makeNode('n1'), ports: [{ id: 'p1', side: 'right' as const, role: 'output' as const }] }
    scene = { ...scene, entities: { n1: node } }
    const next = applyCommands(scene, [{ type: 'remove_port', nodeId: 'n1', portId: 'p1' }])
    expect((next.entities['n1'] as SceneNode).ports).toHaveLength(0)
  })

  it('add_port is a no-op on a non-node entity', () => {
    const cell: SceneCell = { id: 'c1', type: 'cell', position: { x: 0, y: 0 }, value: '1', col: 0, state: {} }
    let scene = createEmptyScene()
    scene = { ...scene, entities: { c1: cell } }
    const next = applyCommands(scene, [
      { type: 'add_port', nodeId: 'c1', port: { id: 'p', side: 'top', role: 'input' } },
    ])
    expect(next).toBe(scene)
  })

  it('remove_port is a no-op on a missing node', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [{ type: 'remove_port', nodeId: 'ghost', portId: 'p' }])
    expect(next).toBe(scene)
  })
})

// ── set_cell with state merge ─────────────────────────────────────────────────────

describe('applyCommands — set_cell state merge', () => {
  it('merges state and updates value together', () => {
    const cell: SceneCell = {
      id: 'c1',
      type: 'cell',
      position: { x: 0, y: 0 },
      value: 'old',
      col: 0,
      state: { role: 'idle', opacity: 1 },
    }
    let scene = createEmptyScene()
    scene = { ...scene, entities: { c1: cell } }
    const next = applyCommands(scene, [
      { type: 'set_cell', cellId: 'c1', value: 'new', state: { role: 'active' } },
    ])
    const updated = next.entities['c1'] as SceneCell
    expect(updated.value).toBe('new')
    expect(updated.state?.role).toBe('active')
    expect(updated.state?.opacity).toBe(1) // preserved
  })
})

// ── create_cell / create_label / add_note ─────────────────────────────────────────

describe('applyCommands — create_cell, create_label, add_note', () => {
  it('create_cell adds a cell entity', () => {
    const scene = createEmptyScene()
    const cell: SceneCell = { id: 'c1', type: 'cell', position: { x: 1, y: 2 }, value: '7', col: 0, state: {} }
    const next = applyCommands(scene, [{ type: 'create_cell', cell }])
    expect(next.entities['c1']).toBeDefined()
    expect((next.entities['c1'] as SceneCell).value).toBe('7')
  })

  it('create_label adds a label', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [{ type: 'create_label', label: makeLabel('lbl') }])
    expect(next.labels['lbl']).toBeDefined()
  })

  it('add_note appends to notes', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [
      { type: 'add_note', text: 'one' },
      { type: 'add_note', text: 'two' },
    ])
    expect(next.notes).toEqual(['one', 'two'])
  })
})

// ── relayout no-op when no positioned entities ────────────────────────────────────

describe('applyCommands — relayout', () => {
  it('returns the same scene when layout produces no positions', () => {
    const scene = createEmptyScene()
    const cmd: SceneCommand = { type: 'relayout', layout: 'graph' }
    const next = applyCommands(scene, [cmd])
    expect(next).toBe(scene)
  })

  it('matrix layout (no layout fn) leaves scene unchanged', () => {
    const scene = { ...createEmptyScene(), entities: { n1: makeNode('n1') } }
    const next = applyCommands(scene, [{ type: 'relayout', layout: 'matrix' }])
    expect(next).toBe(scene)
  })
})

// ── overlay commands (dp-table / grid / callstack) ────────────────────────────────

describe('applyCommands — overlay models', () => {
  it('dp-table.model stores a dp table in overlays', () => {
    const scene = createEmptyScene()
    const model = {
      rows: 1,
      cols: 1,
      rowLabels: ['r'],
      colLabels: ['c'],
      cells: [[{ value: '0', highlights: [] }]],
      dependencies: [],
      formulas: [],
      traceback: [],
    }
    const next = applyCommands(scene, [
      { type: 'dp-table.model', tableId: 't1', model } as unknown as SceneCommand,
    ])
    expect(next.overlays?.dpTables['t1']).toBeDefined()
  })

  it('grid.model stores a grid in overlays', () => {
    const scene = createEmptyScene()
    const model = {
      rows: 1,
      cols: 1,
      cells: {},
      frontier: [],
      path: [],
      arrows: [],
    }
    const next = applyCommands(scene, [
      { type: 'grid.model', gridId: 'g1', model } as unknown as SceneCommand,
    ])
    expect(next.overlays?.grids['g1']).toBeDefined()
  })

  it('overlay.callstack.set stores a call stack model', () => {
    const scene = createEmptyScene()
    const model = { frames: [], highlightedFrameIds: [] }
    const next = applyCommands(scene, [
      { type: 'overlay.callstack.set', model } as unknown as SceneCommand,
    ])
    expect(next.overlays?.callStack).toBeDefined()
  })
})

// ── disconnect on missing edge ────────────────────────────────────────────────────

describe('applyCommands — disconnect missing edge', () => {
  it('disconnecting a non-existent edge returns a scene with no such edge', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [{ type: 'disconnect', edgeId: 'ghost' }])
    expect(next.edges['ghost']).toBeUndefined()
  })
})

// ── move_pointer without explicit label falls back to pointer id ──────────────────

describe('applyCommands — move_pointer label fallback', () => {
  it('uses the pointerId as label when none is provided', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [
      { type: 'move_pointer', pointerId: 'i', target: { entityId: 'n1' } },
    ])
    expect(next.pointers['i'].label).toBe('i')
  })
})

// ── add_note when notes is undefined ──────────────────────────────────────────────

describe('applyCommands — add_note with undefined notes', () => {
  it('initialises the notes array when scene.notes is undefined', () => {
    const scene: SceneState = { ...createEmptyScene(), notes: undefined }
    const next = applyCommands(scene, [{ type: 'add_note', text: 'hello' }])
    expect(next.notes).toEqual(['hello'])
  })
})

// ── relayout with scope filters which entities move ───────────────────────────────

describe('applyCommands — relayout with scope', () => {
  it('only repositions entities listed in scope', () => {
    const a: SceneNode = { ...makeNode('a'), variant: 'linked_list.singly', position: { x: 0, y: 0 } }
    const b: SceneNode = { ...makeNode('b'), variant: 'linked_list.singly', position: { x: 0, y: 0 } }
    let scene: SceneState = createEmptyScene()
    scene = {
      ...scene,
      entities: { a, b },
      edges: { e: { ...makeEdge('e', 'a', 'b'), from: { entityId: 'a', portId: 'next' }, to: { entityId: 'b' } } },
    }
    const next = applyCommands(scene, [{ type: 'relayout', layout: 'linked_list', scope: ['b'] }])
    // 'a' was excluded from scope, so it keeps its original position.
    expect((next.entities['a'] as SceneNode).position).toEqual({ x: 0, y: 0 })
  })
})

// ── unknown command falls through to default ──────────────────────────────────────

describe('applyCommands — unknown command type', () => {
  it('returns scene unchanged for an unrecognised command type', () => {
    const scene = createEmptyScene()
    const next = applyCommands(scene, [{ type: 'not_a_real_command' } as unknown as SceneCommand])
    expect(next).toBe(scene)
  })
})

// ── move on an entity without a position is a no-op ───────────────────────────────

describe('applyCommands — move non-positioned entity', () => {
  it('returns scene unchanged when target entity has no position', () => {
    let scene = createEmptyScene()
    scene = { ...scene, entities: { g1: makeGroup('g1') } }
    const next = applyCommands(scene, [{ type: 'move', entityId: 'g1', to: { x: 5, y: 5 } }])
    expect(next).toBe(scene)
  })
})
