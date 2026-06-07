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
