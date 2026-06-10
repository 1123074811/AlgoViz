import { layoutGraph } from '../graphLayout'
import { createEmptyScene } from '../../types'
import type { SceneState, SceneNode, SceneEdge } from '../../types'

/** Minimal graph scene: nodes -> graph.vertex entities, edges -> from/to edges. */
function makeGraphScene(
  nodes: string[],
  edges: Array<[string, string]>,
  directed: boolean,
): SceneState {
  const scene = createEmptyScene()
  for (const id of nodes) {
    scene.entities[id] = {
      id,
      type: 'node',
      variant: 'graph.vertex',
      position: { x: 0, y: 0 },
      size: { width: 48, height: 48 },
      fields: [{ id: 'value', value: id }],
      ports: [],
    } as SceneNode
  }
  edges.forEach(([a, b], i) => {
    scene.edges[`e${i}`] = {
      id: `e${i}`,
      type: 'edge',
      from: { entityId: a },
      to: { entityId: b },
      directed,
    } as SceneEdge
  })
  return scene
}

/** 3x3 grid nodes and edges (9 nodes 12 edges). */
function gridNodesEdges(): { nodes: string[]; edges: Array<[string, string]> } {
  const nodes: string[] = []
  const edges: Array<[string, string]> = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) nodes.push(`n${r}${c}`)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) edges.push([`n${r}${c}`, `n${r}${c + 1}`])
    if (r < 2) edges.push([`n${r}${c}`, `n${r + 1}${c}`])
  }
  return { nodes, edges }
}

describe('layoutGraph', () => {
  it('uses force layout for dense undirected graphs (not the circular ring)', () => {
    const { nodes, edges } = gridNodesEdges()
    const positions = layoutGraph(makeGraphScene(nodes, edges, false))
    const ids = Object.keys(positions)
    expect(ids.length).toBe(9)
    // Circular layout: all nodes equidistant from center (500, 300).
    // Force layout: nodes scatter, so radii from center vary significantly.
    const radii = ids.map(id =>
      Math.round(Math.hypot(positions[id].x - 500, positions[id].y - 300)),
    )
    // With circular layout, all radii are the same → Set size = 1.
    // With force layout, nodes spread out → Set size > 1.
    expect(new Set(radii).size).not.toBe(1)
  })

  it('keeps the circular layout for small sparse undirected graphs', () => {
    const nodes = ['A', 'B', 'C', 'D', 'E']
    const ring: Array<[string, string]> = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
      ['E', 'A'],
    ]
    const positions = layoutGraph(makeGraphScene(nodes, ring, false))
    // Circular layout: all nodes equidistant from center (500, 300)
    const rs = nodes.map(id =>
      Math.round(Math.hypot(positions[id].x - 500, positions[id].y - 300)),
    )
    expect(new Set(rs).size).toBe(1)
  })

  it('orders nodes within a layer by predecessor barycenter to reduce crossings', () => {
    // layer0: A(top), B(bottom); edges A→Y, B→X.
    // localeCompare would put X above Y → crossed edges;
    // barycenter should put Y(predecessor A, index 0) above X(predecessor B, index 1) → no crossing.
    const positions = layoutGraph(makeGraphScene(
      ['A', 'B', 'X', 'Y'],
      [['A', 'Y'], ['B', 'X']],
      true,
    ))
    expect(positions['Y'].y).toBeLessThan(positions['X'].y)
  })
})
