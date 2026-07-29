import type { AnimationScript, AnimationStep, ActionColor } from '@/types/animation'
import { treeBuilder } from '@/scene/graphics'
import type { AlgorithmEvent } from '@/scene'

/** 单步构造助手:把语义参数拼成 AnimationStep。 */
function step(
  id: number,
  codeLine: number,
  zh: string,
  en: string,
  type: AnimationStep['action']['type'],
  color: ActionColor,
  events: AlgorithmEvent[],
  accesses: number,
): AnimationStep {
  return {
    stepId: id,
    codeLine,
    description: { zh, en },
    action: { type, targets: [], color },
    stats: { comparisons: 0, swaps: 0, accesses },
    events,
  }
}

/**
 * 子集枚举的「选 / 不选」二叉递归树。
 *
 * 对 arr=[1,2,3] 缺省输入,每一层决定一个元素「不选(左)/选(右)」,
 * 叶节点 = 一个完整子集。复用 tree 图元(treeBuilder.create/insert)让调用树
 * 生长,scene.highlight 标当前递归路径(primary)/找到的子集(success);
 * scene.seq_push 把每个完整子集输出到底部序列条。
 *
 * 步数控制:节点上限 ~60,超出后停止展开并 scene.note 概括。
 * 动画可因节点上限截断，但 result 始终返回输入对应的完整子集集合。
 */
export function generateSubsetsTree(arr?: number[]): AnimationScript {
  const data = arr && arr.length > 0 ? [...arr] : [1, 2, 3]
  const n = data.length
  const total = Math.pow(2, n)
  const allSubsets: number[][] = []
  const collect = (index: number, chosen: number[]) => {
    if (index === n) {
      allSubsets.push([...chosen])
      return
    }
    collect(index + 1, chosen)
    chosen.push(data[index])
    collect(index + 1, chosen)
    chosen.pop()
  }
  collect(0, [])

  const steps: AnimationStep[] = []
  let sid = 1
  let acc = 0
  let nodeCount = 1 // 根节点已计入
  const NODE_LIMIT = 60
  let truncated = false
  const subsets: number[][] = []

  // 根节点:空子集 []
  steps.push(step(
    sid++, 1,
    `递归枚举子集:从空集 [] 开始,对每个元素决定「选」或「不选」。每条根到叶的路径就是一个子集`,
    `Enumerate subsets recursively: start from the empty set [], decide pick/skip for each element. Each root-to-leaf path is one subset`,
    'highlight', 'primary',
    [
      treeBuilder.create('r', [{ id: 'r', value: '[]' }], [], 'binary'),
      { type: 'scene.seq_clear' },
      { type: 'scene.highlight', entityId: 'r', color: 'primary', role: 'current' },
    ],
    acc += 1,
  ))

  // 子集文本:{1, 2} 形式,空集显示 ∅
  const fmt = (xs: number[]) => (xs.length === 0 ? '∅' : `{${xs.join(', ')}}`)

  /**
   * 递归生长树。i = 当前决策的元素下标;parentId = 当前节点;chosen = 已选元素。
   * side 仅用于第一层之后的语义提示;tree.insert 的 side 控制左右布局。
   */
  function recurse(parentId: string, i: number, chosen: number[]) {
    if (truncated) return
    if (i === n) {
      // 到达叶:一个完整子集
      subsets.push([...chosen])
      steps.push(step(
        sid++, 6,
        `到达叶节点,得到一个完整子集 ${fmt(chosen)}`,
        `Reached a leaf — a complete subset ${fmt(chosen)}`,
        'mark', 'success',
        [
          { type: 'scene.highlight', entityId: parentId, color: 'success', role: 'safe' },
          { type: 'scene.seq_push', value: fmt(chosen) },
        ],
        acc += 1,
      ))
      return
    }

    const el = data[i]
    // 左子:不选 arr[i]
    const leftId = `${parentId}_L`
    const rightId = `${parentId}_R`

    if (nodeCount + 2 > NODE_LIMIT) {
      truncated = true
      steps.push(step(
        sid++, 0,
        `节点数已达上限,更深的分支省略;子集总数仍为 2^${n} = ${total}`,
        `Node limit reached — deeper branches omitted; total subsets is still 2^${n} = ${total}`,
        'highlight', 'muted',
        [{ type: 'scene.note', text: `…更深分支省略,子集总数 = ${total}` }],
        acc += 1,
      ))
      return
    }

    // ── 不选 arr[i](左) ──
    nodeCount++
    steps.push(step(
      sid++, 4,
      `不选 arr[${i}]=${el},当前已选 ${fmt(chosen)},向左递归`,
      `Skip arr[${i}]=${el}; current subset ${fmt(chosen)}; recurse left`,
      'insert', 'primary',
      [
        treeBuilder.insert(parentId, { id: leftId, value: fmt(chosen) }, 'left'),
        { type: 'scene.highlight', entityId: parentId, color: 'muted', role: 'visited' },
        { type: 'scene.highlight', entityId: leftId, color: 'primary', role: 'current' },
      ],
      acc += 1,
    ))
    recurse(leftId, i + 1, chosen)

    if (truncated) return

    // ── 选 arr[i](右) ──
    nodeCount++
    const nextChosen = [...chosen, el]
    steps.push(step(
      sid++, 5,
      `选 arr[${i}]=${el},当前已选 ${fmt(nextChosen)},向右递归`,
      `Pick arr[${i}]=${el}; current subset ${fmt(nextChosen)}; recurse right`,
      'insert', 'primary',
      [
        treeBuilder.insert(parentId, { id: rightId, value: fmt(nextChosen) }, 'right'),
        { type: 'scene.highlight', entityId: parentId, color: 'muted', role: 'visited' },
        { type: 'scene.highlight', entityId: rightId, color: 'primary', role: 'current' },
      ],
      acc += 1,
    ))
    recurse(rightId, i + 1, nextChosen)
  }

  recurse('r', 0, [])

  // 收尾总结
  steps.push(step(
    sid++, 8,
    `枚举完成!共 ${subsets.length}${truncated ? '+' : ''} 个子集,子集总数 = 2^${n} = ${total}`,
    `Done! Found ${subsets.length}${truncated ? '+' : ''} subsets; total = 2^${n} = ${total}`,
    'mark', 'success',
    [{ type: 'scene.note', text: `子集总数 = 2^${n} = ${total}` }],
    acc += 1,
  ))

  return {
    algorithm: 'subsets',
    presentation: { engine: 'scene', module: 'tree' },
    complexity: { time: { best: 'O(2^n)', average: 'O(2^n)', worst: 'O(n·2^n)' }, space: 'O(n)' },
    result: allSubsets,
    initialState: { type: 'tree', data: [...data] },
    steps: steps as AnimationScript['steps'],
  }
}
