import { describe, it, expect } from 'vitest'
import { layoutTree } from '../treeLayout'
import type { SceneState, SceneNode, SceneEdge, NodeField } from '../../types'

/** Build a B-tree style rectangular node holding the given keys. */
function btreeNode(id: string, keys: number[]): SceneNode {
  const fields: NodeField[] = keys.map((k, i) => ({
    id: `${id}_k${i}`,
    role: 'key',
    value: k,
  }))
  return { id, type: 'node', role: 'tree_node', variant: 'tree.btree', fields }
}

function edge(from: string, to: string): SceneEdge {
  return { id: `${from}->${to}`, type: 'edge', from: { entityId: from }, to: { entityId: to } }
}

function sceneFrom(nodes: SceneNode[], edges: SceneEdge[], rootId: string): SceneState {
  return {
    entities: Object.fromEntries(nodes.map(n => [n.id, n])),
    edges: Object.fromEntries(edges.map(e => [e.id, e])),
    pointers: { root: { id: 'root', type: 'pointer', label: 'root', target: { entityId: rootId } } },
  } as unknown as SceneState
}

/** Rendered half-width used by the layout for a btree node (mirrors textMetrics). */
function halfWidth(node: SceneNode): number {
  // measureNodeRenderWidth: max(96, perField * count); perField for short numbers ≈ 36..
  // We just need a lower bound for the overlap assertion, so reconstruct conservatively.
  const perField = node.fields.reduce((m, f) => {
    const text = String(f.value ?? '')
    return Math.max(m, Math.max(36, Math.min(180, Math.ceil(text.length * 14 * 0.6 + 14))))
  }, 0)
  return Math.max(96, perField * Math.max(node.fields.length, 1)) / 2
}

describe('layoutTree — no overlap for wide B-tree nodes', () => {
  it('keeps adjacent leaf boxes from overlapping (screenshot repro)', () => {
    // root 20 → (7, 27); 7 → (3, [10,13,17,23]); 27 → ([30,33,37])
    const nodes = [
      btreeNode('n20', [20]),
      btreeNode('n7', [7]),
      btreeNode('n27', [27]),
      btreeNode('n3', [3]),
      btreeNode('n10', [10, 13, 17, 23]),
      btreeNode('n30', [30, 33, 37]),
    ]
    const edges = [
      edge('n20', 'n7'), edge('n20', 'n27'),
      edge('n7', 'n3'), edge('n7', 'n10'),
      edge('n27', 'n30'),
    ]
    const scene = sceneFrom(nodes, edges, 'n20')
    const pos = layoutTree(scene)

    // Group nodes by depth (y) and assert horizontal boxes never overlap.
    const byNode = new Map(nodes.map(n => [n.id, n]))
    const rows = new Map<number, string[]>()
    for (const [id, p] of Object.entries(pos)) {
      const row = rows.get(p.y) ?? []
      row.push(id)
      rows.set(p.y, row)
    }
    for (const row of rows.values()) {
      const sorted = row
        .map(id => ({ id, x: pos[id].x, hw: halfWidth(byNode.get(id)!) }))
        .sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const cur = sorted[i]
        const gap = (cur.x - cur.hw) - (prev.x + prev.hw)
        expect(gap, `${prev.id} and ${cur.id} overlap`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('centers the root near x=500', () => {
    const nodes = [btreeNode('r', [50]), btreeNode('a', [25]), btreeNode('b', [75])]
    const edges = [edge('r', 'a'), edge('r', 'b')]
    const pos = layoutTree(sceneFrom(nodes, edges, 'r'))
    expect(pos['r'].x).toBeCloseTo(500, 0)
  })
})
