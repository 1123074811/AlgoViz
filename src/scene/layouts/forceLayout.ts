import type { Point } from '../types'

export interface ForceLayoutOptions {
  cx?: number
  cy?: number
  width?: number
  height?: number
  iterations?: number
  minClearance?: number
}

/**
 * Deterministic Fruchterman-Reingold force-directed layout.
 * No randomness: initial positions on a circle sorted by id, fixed iterations + linear cooling.
 * Same input always produces same output (no node jitter on re-render).
 * Final separation pass guarantees every pairwise distance >= minClearance.
 */
export function forceLayout(
  ids: string[],
  edges: Array<[string, string]>,
  opts: ForceLayoutOptions = {},
): Record<string, Point> {
  const { cx = 500, cy = 300, width = 760, height = 480, iterations = 200, minClearance = 72 } = opts
  const n = ids.length
  if (n === 0) return {}

  const sorted = [...ids].sort()
  const pos = new Map<string, { x: number; y: number }>()
  const initR = Math.min(width, height) / 3
  sorted.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    pos.set(id, { x: cx + Math.cos(angle) * initR, y: cy + Math.sin(angle) * initR })
  })

  const idSet = new Set(ids)
  const links = edges.filter(([a, b]) => idSet.has(a) && idSet.has(b) && a !== b)
  const k = Math.max(Math.sqrt((width * height) / n), minClearance)
  let temp = Math.max(width, height) / 8
  const cool = temp / (iterations + 1)

  for (let it = 0; it < iterations; it++) {
    const disp = new Map(sorted.map(id => [id, { x: 0, y: 0 }]))

    // Repulsive forces: all node pairs
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = pos.get(sorted[i])!, b = pos.get(sorted[j])!
        let dx = a.x - b.x, dy = a.y - b.y
        let d = Math.hypot(dx, dy)
        if (d < 0.01) { dx = 0.01 * (j - i); dy = 0.01; d = Math.hypot(dx, dy) }
        const f = (k * k) / d
        const da = disp.get(sorted[i])!, db = disp.get(sorted[j])!
        da.x += (dx / d) * f; da.y += (dy / d) * f
        db.x -= (dx / d) * f; db.y -= (dy / d) * f
      }
    }

    // Attractive forces: along edges
    for (const [a, b] of links) {
      const pa = pos.get(a)!, pb = pos.get(b)!
      const dx = pa.x - pb.x, dy = pa.y - pb.y
      const d = Math.max(Math.hypot(dx, dy), 0.01)
      const f = (d * d) / k
      const da = disp.get(a)!, db = disp.get(b)!
      da.x -= (dx / d) * f; da.y -= (dy / d) * f
      db.x += (dx / d) * f; db.y += (dy / d) * f
    }

    // Apply displacement with temperature limiting + boundary clamping
    for (const id of sorted) {
      const p = pos.get(id)!, d = disp.get(id)!
      const len = Math.max(Math.hypot(d.x, d.y), 0.01)
      p.x += (d.x / len) * Math.min(len, temp)
      p.y += (d.y / len) * Math.min(len, temp)
      p.x = Math.min(cx + width / 2, Math.max(cx - width / 2, p.x))
      p.y = Math.min(cy + height / 2, Math.max(cy - height / 2, p.y))
    }
    temp -= cool
  }

  // Separation pass: hard guarantee minimum clearance
  for (let pass = 0; pass < 60; pass++) {
    let moved = false
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = pos.get(sorted[i])!, b = pos.get(sorted[j])!
        let dx = b.x - a.x, dy = b.y - a.y
        let d = Math.hypot(dx, dy)
        if (d < 0.01) { dx = 0.5 * (j - i); dy = 0.5; d = Math.hypot(dx, dy) }
        if (d < minClearance) {
          const push = (minClearance - d) / 2 + 0.5
          a.x -= (dx / d) * push; a.y -= (dy / d) * push
          b.x += (dx / d) * push; b.y += (dy / d) * push
          moved = true
        }
      }
    }
    if (!moved) break
  }

  const out: Record<string, Point> = {}
  for (const id of ids) {
    const p = pos.get(id)!
    out[id] = { x: Math.round(p.x), y: Math.round(p.y) }
  }
  return out
}
