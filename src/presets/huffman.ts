import type { AnimationScript, AnimationStep } from '@/types/animation'

interface HNode { id: string; freq: number; char?: string; left?: HNode; right?: HNode }

/** Build a Huffman tree from [char, freq] pairs; emit final tree + ordered merge highlights. */
export function generateHuffman(pairs?: Array<[string, number]>): AnimationScript {
  const input = pairs && pairs.length > 0 ? pairs : [['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]] as Array<[string, number]>
  let counter = 0
  const heap: HNode[] = input.map(([char, freq]) => ({ id: `L${counter++}`, freq, char }))
  const mergeLog: Array<{ id: string; a: HNode; b: HNode }> = []

  // Repeatedly merge the two smallest.
  while (heap.length > 1) {
    heap.sort((x, y) => x.freq - y.freq)
    const a = heap.shift()!, b = heap.shift()!
    const parent: HNode = { id: `I${counter++}`, freq: a.freq + b.freq, left: a, right: b }
    mergeLog.push({ id: parent.id, a, b })
    heap.push(parent)
  }
  const root = heap[0]

  // Flatten to nodes + edges for tree.create.
  const nodes: Array<{ id: string; value: number | string }> = []
  const edges: Array<{ parentId: string; childId: string; port: 'left' | 'right' }> = []
  const codes: Record<string, string> = {}
  ;(function walk(n: HNode, code: string) {
    nodes.push({ id: n.id, value: n.char ? `${n.char}:${n.freq}` : n.freq })
    if (n.char !== undefined) codes[n.char] = code || '0'
    if (n.left) { edges.push({ parentId: n.id, childId: n.left.id, port: 'left' }); walk(n.left, code + '0') }
    if (n.right) { edges.push({ parentId: n.id, childId: n.right.id, port: 'right' }); walk(n.right, code + '1') }
  })(root, '')

  const steps: AnimationStep[] = []
  let sid = 1

  steps.push({
    stepId: sid++, codeLine: 0,
    description: { zh: `频率：${input.map(([c, f]) => `${c}=${f}`).join('、')}。哈夫曼：每次合并两个最小频率节点`, en: `Frequencies: ${input.map(([c, f]) => `${c}=${f}`).join(', ')}. Huffman: repeatedly merge the two smallest` },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{ type: 'tree.create', variant: 'binary', rootId: root.id, nodes, edges }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  })

  mergeLog.forEach((m, idx) => {
    steps.push({
      stepId: sid++, codeLine: 3,
      description: { zh: `合并 ${label(m.a)} + ${label(m.b)} → 频率 ${m.a.freq + m.b.freq} 的内部节点`, en: `Merge ${label(m.a)} + ${label(m.b)} → internal node freq ${m.a.freq + m.b.freq}` },
      action: { type: 'compare', targets: [], color: 'warning' },
      events: [
        { type: 'tree.visit', nodeId: m.a.id },
        { type: 'tree.visit', nodeId: m.b.id },
        { type: 'tree.visit', nodeId: m.id },
      ],
      stats: { comparisons: idx + 1, swaps: 0, accesses: idx + 1 },
    })
  })

  steps.push({
    stepId: sid++, codeLine: 8,
    description: { zh: `编码完成：${Object.entries(codes).map(([c, code]) => `${c}=${code}`).join('、')}`, en: `Codes: ${Object.entries(codes).map(([c, code]) => `${c}=${code}`).join(', ')}` },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: root.id }],
    stats: { comparisons: mergeLog.length, swaps: 0, accesses: mergeLog.length },
  })

  return {
    algorithm: 'huffman',
    complexity: { time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'binary' },
    initialState: { type: 'tree', data: nodes.map(n => (typeof n.value === 'number' ? n.value : 0)) },
    result: codes,
    steps: steps as AnimationScript['steps'],
  }
}

function label(n: HNode): string { return n.char ? `${n.char}(${n.freq})` : `[${n.freq}]` }
