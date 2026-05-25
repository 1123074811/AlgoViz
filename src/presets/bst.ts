import type { AnimationScript } from '@/types/animation'

export function generateBST(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const inserts = [8, 3, 10, 1, 6, 14, 4, 7, 13]
  const bst: number[] = []

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '二叉搜索树 (BST) 插入演示', en: 'BST Insert Demo' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  for (const v of inserts) {
    if (bst.length === 0) {
      bst.push(v)
      steps.push({ stepId: sid++, codeLine: 3, description: { zh: `插入根节点 ${v}`, en: `Insert root ${v}` }, action: { type: 'insert', targets: [0], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
    } else {
      let i = 0
      let depth = 0
      steps.push({ stepId: sid++, codeLine: 5, description: { zh: `插入 ${v}，从根开始比较`, en: `Insert ${v}, compare from root` }, action: { type: 'highlight', targets: [0], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 1 } })
      while (i < bst.length && bst[i] !== 0) {
        steps.push({ stepId: sid++, codeLine: 6, description: { zh: `比较 ${v} ${v < bst[i] ? '<' : '>'} ${bst[i]} → ${v < bst[i] ? '左' : '右'}子树`, en: `Compare ${v} ${v < bst[i] ? '<' : '>'} ${bst[i]} → ${v < bst[i] ? 'left' : 'right'}` }, action: { type: 'compare', targets: [i], color: 'warning' }, stats: { comparisons: sid, swaps: 0, accesses: 2 } })
        i = v < bst[i] ? 2 * i + 1 : 2 * i + 2
        depth++
      }
      while (bst.length <= i) bst.push(0)
      bst[i] = v
      steps.push({ stepId: sid++, codeLine: 8, description: { zh: `插入 ${v} 到索引 ${i} (深度=${depth})`, en: `Insert ${v} at idx ${i} (depth=${depth})` }, action: { type: 'insert', targets: [i], color: 'success' }, stats: { comparisons: depth, swaps: 0, accesses: 3 } })
    }
  }

  steps.push({ stepId: sid++, codeLine: 10, description: { zh: `BST 构建完成，共 ${inserts.length} 个节点`, en: `BST built with ${inserts.length} nodes` }, action: { type: 'mark', targets: bst.map((_, k) => k).filter(k => bst[k] !== 0), color: 'success' }, stats: { comparisons: sid, swaps: 0, accesses: inserts.length * 3 } })

  return { algorithm: 'bst', complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' }, initialState: { type: 'tree', data: bst.filter(v => v !== 0) }, steps: steps as AnimationScript['steps'] }
}
