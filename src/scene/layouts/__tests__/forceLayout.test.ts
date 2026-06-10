import { forceLayout } from '../forceLayout'

/** 3x3 grid graph: 9 nodes 12 edges. */
function gridGraph(): { ids: string[]; edges: Array<[string, string]> } {
  const ids: string[] = []
  const edges: Array<[string, string]> = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ids.push(`n${r}${c}`)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (c < 2) edges.push([`n${r}${c}`, `n${r}${c + 1}`])
    if (r < 2) edges.push([`n${r}${c}`, `n${r + 1}${c}`])
  }
  return { ids, edges }
}

describe('forceLayout', () => {
  it('is deterministic: same input -> identical output', () => {
    const { ids, edges } = gridGraph()
    const a = forceLayout(ids, edges, { minClearance: 72 })
    const b = forceLayout(ids, edges, { minClearance: 72 })
    expect(a).toEqual(b)
  })

  it('keeps every pair of nodes at least minClearance apart', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { minClearance: 72 })
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos[ids[i]], b = pos[ids[j]]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        expect(d).toBeGreaterThanOrEqual(72)
      }
    }
  })

  it('keeps all nodes inside the bounding box', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { cx: 500, cy: 300, width: 760, height: 480 })
    for (const id of ids) {
      expect(pos[id].x).toBeGreaterThanOrEqual(500 - 380)
      expect(pos[id].x).toBeLessThanOrEqual(500 + 380)
      expect(pos[id].y).toBeGreaterThanOrEqual(300 - 240)
      expect(pos[id].y).toBeLessThanOrEqual(300 + 240)
    }
  })

  it('places linked nodes closer than the average unlinked pair', () => {
    const { ids, edges } = gridGraph()
    const pos = forceLayout(ids, edges, { minClearance: 72 })
    const dist = (a: string, b: string) => Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y)
    const linked = edges.map(([a, b]) => dist(a, b))
    const linkedSet = new Set(edges.map(([a, b]) => [a, b].sort().join('|')))
    const unlinked: number[] = []
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (!linkedSet.has([ids[i], ids[j]].sort().join('|'))) unlinked.push(dist(ids[i], ids[j]))
    }
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
    expect(avg(linked)).toBeLessThan(avg(unlinked))
  })

  it('handles empty input', () => {
    expect(forceLayout([], [])).toEqual({})
  })
})
