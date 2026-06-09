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
  const sorted = pts.map((p, i) => ({ p, i })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1])
  const lower: Array<{ p: Pt; i: number }> = []
  for (const cur of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2].p, lower[lower.length - 1].p, cur.p) <= 0) lower.pop()
    lower.push(cur)
    push(`加入点 ${cur.i}，维护下凸壳`, `Add point ${cur.i}, maintain lower hull`,
      lower.slice(1).map((q, k) => ({ type: 'geometry.segment' as const, id: `low_${k}`, from: lower[k].p, to: q.p, color: 'success' })))
  }
  push('凸包构建完成（下链）', 'Lower hull done', [])

  return {
    algorithm: 'convex_hull',
    complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'geometry' },
    initialState: { type: 'array', data: [] },
    steps,
  }
}
