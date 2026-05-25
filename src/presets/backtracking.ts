import type { AnimationScript } from '@/types/animation'

export function generateBacktracking(): AnimationScript {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = []
  let sid = 1
  const result = [1, 2, 3]

  steps.push({ stepId: sid++, codeLine: 0, description: { zh: '回溯算法 — 尝试所有选择，遇到不合法的立即回退', en: 'Backtracking — try all choices, backtrack when invalid' }, action: { type: 'highlight', targets: [], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 0 } })

  steps.push({ stepId: sid++, codeLine: 2, description: { zh: '决策树：根→选择1→选择2→选择3', en: 'Decision tree: root → choice1 → choice2 → choice3' }, action: { type: 'highlight', targets: [0, 1, 2], color: 'primary' }, stats: { comparisons: 0, swaps: 0, accesses: 3 } })

  steps.push({ stepId: sid++, codeLine: 4, description: { zh: '选择不合法？撤销回退 (backtrack)', en: 'Invalid choice? Undo and backtrack' }, action: { type: 'delete', targets: [2], color: 'danger' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } })

  steps.push({ stepId: sid++, codeLine: 5, description: { zh: '尝试其他分支: 1→2→?', en: 'Try other branch: 1→2→?' }, action: { type: 'highlight', targets: [0, 1], color: 'warning' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } })

  steps.push({ stepId: sid++, codeLine: 7, description: { zh: '找到可行解，记录结果', en: 'Found valid solution, record result' }, action: { type: 'mark', targets: [0, 1], color: 'success' }, stats: { comparisons: 0, swaps: 0, accesses: 2 } })

  return { algorithm: 'backtracking', complexity: { time: { best: 'O(k^n)', average: 'O(k^n)', worst: 'O(k^n)' }, space: 'O(n)' }, initialState: { type: 'array', data: result }, steps: steps as AnimationScript['steps'] }
}
