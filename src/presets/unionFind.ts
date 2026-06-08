import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'

export function generateUnionFind(edges?: number[][]): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1

  const unions = edges && edges.length > 0 ? edges : [[0, 1], [1, 2], [3, 4], [4, 5], [2, 4]]
  let n = 6
  for (const [a, b] of unions) n = Math.max(n, a + 1, b + 1)

  const parent = Array.from({ length: n }, (_v, i) => i)
  const rank = Array.from({ length: n }, () => 0)
  const initialParent = [...parent]

  const snapshot = (activeIndices: number[] = []) => ({
    variables: { parent: `[${parent.join(', ')}]`, rank: `[${rank.join(', ')}]` },
    ranges: activeIndices.map((index) => ({ id: `uf_${index}`, label: String(index), start: index, end: index, role: 'current' as const, color: 'primary' as const })),
  })

  function pushStep(
    codeLine: number,
    zh: string,
    en: string,
    events: AlgorithmEvent[],
    targets: number[] = [],
    color: AnimationStep['action']['color'] = 'primary',
  ) {
    steps.push({
      stepId: sid++,
      codeLine,
      description: { zh, en },
      action: { type: 'highlight', targets, color },
      events,
      stats: { comparisons: Math.max(0, sid - 2), swaps: 0, accesses: targets.length },
      teachingState: snapshot(targets),
    })
  }

  pushStep(
    0,
    `初始化并查集: parent=[${parent.join(', ')}], rank=[${rank.join(', ')}]`,
    `Initialize Union-Find: parent=[${parent.join(', ')}], rank=[${rank.join(', ')}]`,
    [{ type: 'union_find.create', size: n, parent: [...parent], rank: [...rank] }],
    Array.from({ length: n }, (_v, i) => i),
  )

  function find(x: number): number {
    const path: number[] = []
    let cur = x
    path.push(cur)
    while (parent[cur] !== cur) {
      cur = parent[cur]
      path.push(cur)
    }
    const root = cur

    pushStep(
      4,
      `find(${x}): 沿 parent 链 ${path.join(' -> ')} 找到根 ${root}`,
      `find(${x}): follow ${path.join(' -> ')} to root ${root}`,
      [{ type: 'union_find.find', node: x, root, path: [...path], parent: [...parent], rank: [...rank] }],
      path,
      'warning',
    )

    for (const node of path.slice(0, -1)) {
      const oldParent = parent[node]
      if (oldParent !== root) {
        parent[node] = root
        pushStep(
          6,
          `路径压缩: parent[${node}] 从 ${oldParent} 改为 ${root}`,
          `Path compression: parent[${node}] changes from ${oldParent} to ${root}`,
          [{ type: 'union_find.compress', node, from: oldParent, to: root, parent: [...parent], rank: [...rank] }],
          [node, root],
          'primary',
        )
      }
    }

    return root
  }

  function union(x: number, y: number) {
    pushStep(
      8,
      `处理 union(${x}, ${y})：先分别查找两个元素的代表元`,
      `Process union(${x}, ${y}): first find both representatives`,
      [{ type: 'scene.note', text: `union(${x}, ${y})` }],
      [x, y],
      'primary',
    )

    const px = find(x)
    const py = find(y)

    if (px === py) {
      pushStep(
        9,
        `find(${x}) 和 find(${y}) 都是 ${px}，已经属于同一集合`,
        `Both find(${x}) and find(${y}) are ${px}; they are already connected`,
        [{ type: 'union_find.same', x, y, root: px, parent: [...parent], rank: [...rank] }],
        [x, y, px],
        'success',
      )
      return
    }

    let childRoot = py
    let parentRoot = px
    let reason = 'rank 相同，默认把第二个根挂到第一个根下，并提升 rank'
    if (rank[px] < rank[py]) {
      childRoot = px
      parentRoot = py
      reason = `rank[${px}] < rank[${py}]，把 ${px} 挂到 ${py} 下`
    } else if (rank[px] > rank[py]) {
      childRoot = py
      parentRoot = px
      reason = `rank[${px}] > rank[${py}]，把 ${py} 挂到 ${px} 下`
    } else {
      rank[px] += 1
    }

    parent[childRoot] = parentRoot
    pushStep(
      10,
      `合并根 ${px} 和 ${py}: ${reason}，parent[${childRoot}]=${parentRoot}`,
      `Merge roots ${px} and ${py}: ${reason}; parent[${childRoot}]=${parentRoot}`,
      [{ type: 'union_find.link', childRoot, parentRoot, parent: [...parent], rank: [...rank], reason }],
      [childRoot, parentRoot],
      'success',
    )
  }

  for (const [a, b] of unions) union(a, b)

  pushStep(
    12,
    `并查集操作结束: parent=[${parent.join(', ')}], rank=[${rank.join(', ')}]`,
    `Union-Find operations complete: parent=[${parent.join(', ')}], rank=[${rank.join(', ')}]`,
    [{ type: 'union_find.done', parent: [...parent], rank: [...rank] }],
    Array.from({ length: n }, (_v, i) => i),
    'success',
  )

  return {
    algorithm: 'union_find',
    complexity: { time: { best: 'O(α(n))', average: 'O(α(n))', worst: 'O(α(n))' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'union_find' },
    initialState: { type: 'union_find', data: initialParent },
    steps,
  }
}
