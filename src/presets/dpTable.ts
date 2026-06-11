import type { AnimationScript, AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'

/** 一个 DP 格的计算结果:值 + 转移方程文本 + 依赖格。 */
export interface DPCell {
  value: number | string
  /** 本格的转移方程文本(中英),展示在「当前 DP 方程」框。 */
  formula?: { zh: string; en: string }
  /** 本格依赖的来源格,会以 dependency 高亮。 */
  deps?: Array<{ row: number; col: number }>
  /** 本步说明(中英)。 */
  desc?: { zh: string; en: string }
}

export interface DPTableConfig {
  algorithm: string
  title: { zh: string; en: string }
  rows: number
  cols: number
  rowLabels?: string[]
  colLabels?: string[]
  /** 建表时预填的基态值(如第 0 行/列),未填处为 0/空。 */
  initial?: Array<Array<number | string | null>>
  /** 变量面板初值(如 i、j、当前值)。 */
  vars?: Array<{ name: string; value: number | string }>
  /** 填表顺序;默认按行主序遍历所有「非基态」格。 */
  order: Array<{ row: number; col: number }>
  /** 计算一格:返回值/方程/依赖,以及本格要更新的变量。 */
  compute: (r: number, c: number, dp: number[][]) => DPCell & { vars?: Record<string, number | string> }
  intro: { zh: string; en: string }
  complexity: AnimationScript['complexity']
  /** 答案格 + 完成提示。 */
  answer: { row: number; col: number }
  done: { zh: string; en: string }
}

const TABLE_ID = 'dp'

/**
 * 通用 2D 动态规划可视化生成器:产出与代码实验室一致的「DP 状态表 + 当前方程 + 变量面板」。
 * 行主序 DP(背包/LCS/编辑距离等)直接用默认 order;区间 DP 传入对角线 order。
 */
export function generateDPTable(cfg: DPTableConfig): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  let accesses = 0
  const dp: number[][] = Array.from({ length: cfg.rows }, (_, r) =>
    Array.from({ length: cfg.cols }, (_, c) => {
      const v = cfg.initial?.[r]?.[c]
      return typeof v === 'number' ? v : 0
    }),
  )

  const push = (codeLine: number, desc: { zh: string; en: string }, events: AlgorithmEvent[], color: 'primary' | 'warning' | 'success' | 'muted' = 'primary') => {
    steps.push({
      stepId: sid++,
      codeLine,
      description: desc,
      action: { type: 'highlight', targets: [], color },
      events: events as AnimationStep['events'],
      stats: { comparisons: 0, swaps: 0, accesses },
    })
  }

  // 1. 变量面板
  if (cfg.vars && cfg.vars.length > 0) {
    push(0, cfg.intro, [{ type: 'math.init', vars: cfg.vars.map(v => ({ ...v })) }])
  }

  // 2. 建表(带标题、行列标签、基态值)
  push(0, cfg.vars && cfg.vars.length > 0 ? cfg.title : cfg.intro, [{
    type: 'dp.create',
    id: TABLE_ID,
    rows: cfg.rows,
    cols: cfg.cols,
    title: cfg.title.zh,
    rowLabels: cfg.rowLabels,
    colLabels: cfg.colLabels,
    values: cfg.initial,
  }])

  // 3. 逐格填表
  for (const { row, col } of cfg.order) {
    const cell = cfg.compute(row, col, dp)
    accesses += 1 + (cell.deps?.length ?? 0)
    const events: AlgorithmEvent[] = []
    if (cell.vars) {
      for (const [name, value] of Object.entries(cell.vars)) {
        events.push({ type: 'math.set', name, value })
      }
    }
    events.push({ type: 'dp.highlight', id: TABLE_ID, cells: [{ row, col }], kind: 'current' })
    if (cell.deps && cell.deps.length > 0) {
      events.push({ type: 'dp.highlight', id: TABLE_ID, cells: cell.deps, kind: 'dependency' })
    }
    if (cell.formula) {
      events.push({ type: 'dp.formula', id: TABLE_ID, target: { row, col }, text: cell.formula.zh })
    }
    const numeric = typeof cell.value === 'number' ? cell.value : Number(cell.value)
    if (Number.isFinite(numeric)) dp[row][col] = numeric
    events.push({ type: 'dp.set', id: TABLE_ID, row, col, value: cell.value, formula: cell.formula?.zh })
    push(5, cell.desc ?? { zh: `计算 dp[${row}][${col}]`, en: `Compute dp[${row}][${col}]` }, events, 'warning')
  }

  // 4. 答案格 + 完成
  push(8, cfg.done, [
    { type: 'dp.highlight', id: TABLE_ID, cells: [cfg.answer], kind: 'answer' },
  ], 'success')

  return {
    algorithm: cfg.algorithm,
    complexity: cfg.complexity,
    presentation: { engine: 'scene', module: 'array' },
    initialState: { type: 'array', data: [] },
    result: dp[cfg.answer.row][cfg.answer.col],
    steps: steps as AnimationScript['steps'],
  }
}

/** 行主序遍历(默认填表顺序):从 startRow/startCol 起遍历全表。 */
export function rowMajorOrder(rows: number, cols: number, startRow = 1, startCol = 1): Array<{ row: number; col: number }> {
  const order: Array<{ row: number; col: number }> = []
  for (let r = startRow; r < rows; r++) {
    for (let c = startCol; c < cols; c++) order.push({ row: r, col: c })
  }
  return order
}
