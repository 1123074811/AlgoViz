import type { AlgorithmCategory } from '../../categories'
import type { QualityContext, QualityIssue, QualityRule } from '../types'

/** 收集 ctx.script 中出现过的全部事件 type（如 'graph.visit_node'）。 */
function eventTypes(ctx: QualityContext): string[] {
  const out: string[] = []
  for (const step of ctx.script.steps ?? []) {
    for (const ev of step.events ?? []) {
      const t = (ev as { type?: unknown }).type
      if (typeof t === 'string') out.push(t)
    }
  }
  return out
}

function hasStructure(ctx: QualityContext, family: string): boolean {
  return ctx.structuresCreated.has(family)
}

/** 某 family 的非 create 操作事件数（来自预计算的 opCountByFamily）。 */
function opCount(ctx: QualityContext, family: string): number {
  return ctx.opCountByFamily[family] ?? 0
}

/** 精确事件类型计数。 */
function countTypes(ctx: QualityContext, wanted: string[]): number {
  const set = new Set(wanted)
  return eventTypes(ctx).filter(t => set.has(t)).length
}

const BACKTRACK_PATTERN = /backtrack|回溯|n_?queens?|sudoku|数独|permut|combin|subset|全排列|组合|子集/i

/** 回溯类动画如果只画调用栈、不画搜索树，用户看不到搜索空间与剪枝位置。 */
export const searchTreeRule: QualityRule = {
  id: 'recursion.missing-search-tree',
  appliesTo: ['recursion'],
  check(ctx) {
    const hay = `${ctx.script.algorithm ?? ''}\n${ctx.sourceCode ?? ''}`
    if (!BACKTRACK_PATTERN.test(hay)) return []

    let hasCallstackPush = false
    let hasTreeEvent = false
    for (const step of ctx.script.steps ?? []) {
      for (const ev of step.events ?? []) {
        if (ev.type === 'callstack.push') hasCallstackPush = true
        if (ev.type.startsWith('tree.')) hasTreeEvent = true
      }
    }

    if (!hasCallstackPush || hasTreeEvent) return []
    return [{
      code: 'recursion.missing-search-tree',
      severity: 'error',
      message: '回溯算法只画了调用栈，没有搜索树：用户看不到搜索空间形状与剪枝发生的位置。',
      hint: '在调用栈之外补建搜索树：第一步 b.searchRoot(初始状态标签)；每次做选择 const id = b.searchTry(父节点id, 选择标签)；冲突/剪枝 b.searchFail(id)；撤销 b.searchBack(id)；到达解 b.searchOk(id)。只展开前 2~4 层代表性分支。',
    }]
  },
}

/** 用谓词构造一条类别规则；谓词为真=通过(无 issue)，为假=报一条 error。 */
function rule(
  category: AlgorithmCategory,
  id: string,
  message: string,
  hint: string,
  predicate: (ctx: QualityContext) => boolean,
): QualityRule {
  return {
    id,
    appliesTo: [category],
    check(ctx) {
      if (predicate(ctx)) return []
      const issue: QualityIssue = { code: id, severity: 'error', message, hint }
      return [issue]
    },
  }
}

/**
 * 各类别专属质量规则。由 lead 接线进 CATEGORY_PROFILES[id].rules，
 * 并在 runQualityGate 时作为该类别的 extraRules 传入。
 */
export const CATEGORY_RULES: Record<AlgorithmCategory, QualityRule[]> = {
  graph: [
    rule(
      'graph',
      'graph.requires-graph-structure',
      '图算法必须创建 graph 结构并产生图操作',
      '用 b.graphCreate(nodes, edges) 建图，并用 b.visitNode/visitEdge/relaxEdge 体现遍历。',
      ctx => hasStructure(ctx, 'graph') && opCount(ctx, 'graph') > 0,
    ),
  ],
  dp: [
    rule(
      'dp',
      'dp.requires-dp-table',
      'DP 算法必须创建 dp 表并通过 dp.set 填充状态',
      '用 b.dpCreate(id, rows, cols) 建表，逐格 b.dpSet(...) 填值并配 dpDependency 指出转移来源。',
      ctx => hasStructure(ctx, 'dp') && countTypes(ctx, ['dp.set']) > 0,
    ),
  ],
  recursion: [
    rule(
      'recursion',
      'recursion.requires-callstack',
      '递归算法必须用调用栈体现递归（至少一次 callstack.push）',
      '进入每层递归 b.callPush(...)，返回/回溯 b.callPop()/callReturn(...)，使栈高随递归深度增减。',
      ctx => countTypes(ctx, ['callstack.push']) > 0,
    ),
    searchTreeRule,
  ],
  grid: [
    rule(
      'grid',
      'grid.requires-cell-ops',
      '网格算法必须产生网格格子操作（grid.visit 或 grid.set_cell）',
      '用 b.gridCreate(真实网格) 后，遍历中 b.gridVisit/gridSet 反映访问与标记。',
      ctx => countTypes(ctx, ['grid.visit', 'grid.set_cell']) > 0,
    ),
  ],
  tree: [
    rule(
      'tree',
      'tree.requires-tree-structure',
      '树算法必须创建 tree 结构',
      '用 b.treeCreate(variant, rootId, nodes, edges) 建树，并用 treeVisit/treeInsert/treeCompare 体现操作。',
      ctx => hasStructure(ctx, 'tree'),
    ),
  ],
  structure: [
    rule(
      'structure',
      'structure.requires-container',
      '数据结构类算法必须使用 栈/队列/哈希表/集合 之一并对其操作',
      '用对应 b.stackCreate/queueCreate/hashCreate/setCreate 建容器，并发对应的 push/pop/put/add 操作。',
      ctx =>
        ['stack', 'queue', 'hashtable', 'hash', 'set'].some(
          fam => hasStructure(ctx, fam) && opCount(ctx, fam) > 0,
        ),
    ),
  ],
  linear: [
    rule(
      'linear',
      'linear.requires-array-ops',
      '线性/数组算法必须创建 array 并产生 compare/swap/set_value 操作',
      '用 b.arrayCreate(input) 后，按算法逻辑发 b.compare/swap/setValue 等操作事件。',
      ctx =>
        hasStructure(ctx, 'array') &&
        countTypes(ctx, ['array.compare', 'array.swap', 'array.set_value']) > 0,
    ),
  ],
}
