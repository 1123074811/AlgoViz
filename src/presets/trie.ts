import type { ActionColor, AnimationScript, AnimationStep } from '@/types/animation'

interface TrieNode {
  id: string
  value: string
  end?: boolean
}

const nodeId = (prefix: string) => `trie_${encodeURIComponent(prefix)}`

export function generateTrie(input?: string[]): AnimationScript {
  const words = input?.length ? [...new Set(input.filter(Boolean))] : ['cat', 'car', 'dog']
  const rootId = 'trie_root'
  const nodes = new Map<string, TrieNode>([[rootId, { id: rootId, value: '∅' }]])
  const children = new Map<string, string[]>()
  const steps: AnimationStep[] = [{
    stepId: 1,
    codeLine: 1,
    description: {
      zh: `创建 Trie 根节点，准备插入 ${words.length} 个单词`,
      en: `Create the Trie root and insert ${words.length} words`,
    },
    action: { type: 'highlight', targets: [], color: 'primary' },
    events: [{
      type: 'tree.create',
      variant: 'trie',
      rootId,
      nodes: [{ id: rootId, value: '∅' }],
      edges: [],
    }],
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
  }]

  let stepId = 2
  for (const word of words) {
    let prefix = ''
    let parentId = rootId
    const path = [rootId]
    const events: NonNullable<AnimationStep['events']> = []

    for (const character of word) {
      prefix += character
      const id = nodeId(prefix)
      path.push(id)
      if (!nodes.has(id)) {
        nodes.set(id, { id, value: character })
        const siblings = children.get(parentId) ?? []
        siblings.push(id)
        children.set(parentId, siblings)
        events.push({ type: 'tree.insert', parentId, node: { id, value: character } })
      }
      parentId = id
    }
    const terminal = nodes.get(parentId)
    if (terminal) terminal.end = true

    steps.push({
      stepId: stepId++,
      codeLine: 4,
      description: {
        zh: `插入 "${word}"：沿 ${[...word].join(' → ')} 复用公共前缀，只创建缺失节点`,
        en: `Insert "${word}": reuse its shared prefix and create only missing nodes`,
      },
      action: { type: 'insert', targets: [], color: 'success' },
      events: events.length ? events : path.slice(1).map(id => ({ type: 'tree.visit' as const, nodeId: id })),
      stats: { comparisons: word.length, swaps: 0, accesses: word.length },
      teachingState: {
        tree: {
          traversalPath: path,
          nodeStates: path.map((id, index) => ({
            id,
            role: index === path.length - 1 ? 'child' as const : 'path' as const,
            color: (index === path.length - 1 ? 'success' : 'primary') as ActionColor,
          })),
        },
      },
    })
  }

  steps.push({
    stepId,
    codeLine: 8,
    description: {
      zh: `Trie 构建完成：${words.join(', ')}`,
      en: `Trie complete: ${words.join(', ')}`,
    },
    action: { type: 'mark', targets: [], color: 'success' },
    events: [{ type: 'tree.visit', nodeId: rootId }],
    stats: { comparisons: words.reduce((sum, word) => sum + word.length, 0), swaps: 0, accesses: nodes.size },
  })

  return {
    algorithm: 'trie',
    complexity: { time: { best: 'O(k)', average: 'O(k)', worst: 'O(k)' }, space: 'O(n*k)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'trie' },
    initialState: {
      type: 'tree',
      data: [],
      root: rootId,
      treeNodes: [...nodes.values()].map(node => ({
        id: node.id,
        value: node.value,
        metadata: node.end ? { end: true } : undefined,
      })),
      children: Object.fromEntries(children),
    },
    result: words,
    steps,
  }
}
