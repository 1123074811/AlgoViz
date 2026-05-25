import type { AnimationScript } from '@/types/animation'

export function generateTrie(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: 'Trie 字典树 — 前缀树，高效字符串存储和查找', en: 'Trie — Prefix tree for efficient string storage/lookup' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  const words = ['cat', 'car', 'dog']
  const display = [0, ...words.join('').split('').map(c => c.charCodeAt(0) - 96)]
  for (let i = 0; i < words.length; i++) {
    steps.push({ stepId: sid++, codeLine: 3, description: { zh: `插入 "${words[i]}"：逐字符创建节点`, en: `Insert "${words[i]}": create nodes char by char` }, action: { type: 'insert', targets: [i], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: words[i].length } })
  }

  steps.push({ stepId: sid++, codeLine: 7, description: { zh: `查找 "cat": c→a→t ✓  (已存储)`, en: `Search "cat": c→a→t ✓ (exists)` }, action: { type: 'compare', targets: [0, 1, 2], color: 'success' }, stats: { comparisons: 3, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 8, description: { zh: `查找 "can": c→a→n ✗  (n 节点不存在)`, en: `Search "can": c→a→n ✗ (n not found)` }, action: { type: 'compare', targets: [0, 1], color: 'danger' }, stats: { comparisons: 2, swaps: 0, accesses: 2 } })

  steps.push({ stepId: sid++, codeLine: 9, description: { zh: '前缀树完成。节点数=8，查找 O(k)', en: 'Trie done. 8 nodes, lookup O(k)' }, action: { type: 'mark', targets: [], color: 'success' }, stats: { comparisons: 5, swaps: 0, accesses: 8 } })

  return { algorithm: 'trie', complexity: { time: { best: 'O(k)', average: 'O(k)', worst: 'O(k)' }, space: 'O(n*k)' }, initialState: { type: 'array', data: display }, steps: steps as AnimationScript['steps'] }
}
