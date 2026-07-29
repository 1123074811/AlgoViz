import type { AnimationScript } from '@/types/animation'

type Pt = [number, number]
const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

export function generateConvexHull(input?: Pt[]): AnimationScript {
  const pts: Pt[] = (input && input.length >= 3 ? input : [[0, 0], [5, 0], [5, 5], [0, 5], [2, 2], [3, 1]])
    .map(([x, y]) => [x, y] as Pt)
  const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
  const xRange: Pt = [Math.min(...xs) - 1, Math.max(...xs) + 1]
  const yRange: Pt = [Math.min(...ys) - 1, Math.max(...ys) + 1]
  const steps: AnimationScript['steps'] = []
  let sid = 1
  const push = (zh: string, en: string, events: AnimationScript['steps'][number]['events']) =>
    steps.push({ stepId: sid++, codeLine: 0, description: { zh, en }, action: { type: 'highlight', targets: [], color: 'primary' }, events, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  push('初始化平面与点集', 'Init plane and points', [
    { type: 'geometry.plane', xRange, yRange },
    ...pts.map((p, i) => ({ type: 'geometry.point' as const, id: `p${i}`, x: p[0], y: p[1], label: String(i) })),
  ])

  // Andrew monotone chain
  const sorted = [...new Map(pts.map((p, i) => [`${p[0]},${p[1]}`, { p, i }])).values()]
    .sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1])
  const lower: Array<{ p: Pt; i: number }> = []
  for (const cur of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2].p, lower[lower.length - 1].p, cur.p) <= 0) lower.pop()
    lower.push(cur)
    push(`加入点 ${cur.i}，维护下凸壳`, `Add point ${cur.i}, maintain lower hull`,
      lower.slice(1).map((q, k) => ({ type: 'geometry.segment' as const, id: `low_${k}`, from: lower[k].p, to: q.p, color: 'success' })))
  }
  const upper: Array<{ p: Pt; i: number }> = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const cur = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2].p, upper[upper.length - 1].p, cur.p) <= 0) upper.pop()
    upper.push(cur)
    push(`加入点 ${cur.i}，维护上凸壳`, `Add point ${cur.i}, maintain upper hull`,
      upper.slice(1).map((q, k) => ({ type: 'geometry.segment' as const, id: `up_${k}`, from: upper[k].p, to: q.p, color: 'primary' })))
  }
  const hull = sorted.length <= 2
    ? sorted
    : [...lower.slice(0, -1), ...upper.slice(0, -1)]
  push('上下凸壳合并完成', 'Lower and upper hull merged',
    hull.length < 2 ? [] : hull.map((point, index) => ({
      type: 'geometry.segment' as const,
      id: `hull_${index}`,
      from: point.p,
      to: hull[(index + 1) % hull.length].p,
      color: 'success',
    })))

  return {
    algorithm: 'convex_hull',
    complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'geometry' },
    initialState: { type: 'array', data: [] },
    result: hull.map(point => point.p),
    steps,
  }
}
