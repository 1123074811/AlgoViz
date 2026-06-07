import type { AlgorithmEvent } from '@/scene'
import type { QualityContext, QualityIssue, QualityRule } from '../types'

/** 不计入「结构」的事件族（场景装饰 / 指针辅助，无需独立操作事件）。 */
const NON_STRUCTURE_FAMILIES = new Set(['scene', 'pointer'])

/** 遍历脚本所有步骤的事件。 */
function* iterEvents(ctx: QualityContext): Generator<AlgorithmEvent> {
  for (const step of ctx.script.steps ?? []) {
    for (const ev of step.events ?? []) yield ev
  }
}

/**
 * empty-structure(error)：某结构族在 structuresCreated 中，
 * 但其非 create 操作事件数为 0（排除 scene/pointer 这类非结构族）。
 */
export const emptyStructureRule: QualityRule = {
  id: 'empty-structure',
  check(ctx) {
    const issues: QualityIssue[] = []
    for (const family of ctx.structuresCreated) {
      if (NON_STRUCTURE_FAMILIES.has(family)) continue
      if ((ctx.opCountByFamily[family] ?? 0) === 0) {
        issues.push({
          code: 'empty-structure',
          severity: 'error',
          message: `结构「${family}」被创建后从未发生任何操作。`,
          hint: `结构 ${family} 创建后从未操作，请在创建 ${family}.create 之后发出对应的操作事件（如 ${family}.push / ${family}.set_cell / ${family}.compare 等），让该结构产生可见的变化。`,
        })
      }
    }
    return issues
  },
}

/**
 * no-operations(error)：排除 scene 后，所有操作事件总数 < 3。
 */
export const noOperationsRule: QualityRule = {
  id: 'no-operations',
  check(ctx) {
    let total = 0
    for (const [family, count] of Object.entries(ctx.opCountByFamily)) {
      if (family === 'scene') continue
      total += count
    }
    if (total < 3) {
      return [
        {
          code: 'no-operations',
          severity: 'error',
          message: `有效操作事件过少（${total} < 3），动画几乎没有实质变化。`,
          hint: '动画缺少实质操作步骤，请逐步发出体现算法过程的操作事件（如 array.compare / array.swap / grid.visit / callstack.push 等），让每个关键步骤都有可见变化，总数至少 3 个。',
        },
      ]
    }
    return []
  },
}

/**
 * empty-desc：空描述（或「步骤 N」占位）步骤占比 > 0.3 为 error，否则 warn；
 * stepCount === 0 时跳过。
 */
export const emptyDescRule: QualityRule = {
  id: 'empty-desc',
  check(ctx) {
    if (ctx.stepCount === 0) return []
    if (ctx.emptyDescCount === 0) return []
    const ratio = ctx.emptyDescCount / ctx.stepCount
    const severity: QualityIssue['severity'] = ratio > 0.3 ? 'error' : 'warn'
    return [
      {
        code: 'empty-desc',
        severity,
        message: `有 ${ctx.emptyDescCount}/${ctx.stepCount} 个步骤的中文描述为空或为「步骤 N」占位。`,
        hint: '请为每个步骤填写有教学意义的中文 description.zh（说明本步在做什么、为什么这样做），不要留空或使用「步骤 1」「步骤 2」这类占位文本。',
      },
    ]
  },
}

/**
 * low-codeline(warn)：带有效 codeLine 的步骤占比 < 0.4。
 */
export const lowCodeLineRule: QualityRule = {
  id: 'low-codeline',
  check(ctx) {
    if (ctx.stepCount === 0) return []
    if (ctx.codeLineCoverage < 0.4) {
      const pct = Math.round(ctx.codeLineCoverage * 100)
      return [
        {
          code: 'low-codeline',
          severity: 'warn',
          message: `仅 ${pct}% 的步骤带有有效 codeLine，代码高亮箭头几乎不动。`,
          hint: '请为大多数步骤设置正确的 codeLine（指向当前正在执行的源码行，>=0），使代码高亮箭头随算法推进而移动，覆盖率至少达到 40%。',
        },
      ]
    }
    return []
  },
}

/** 收集脚本中某结构族的所有 create 事件的二维 values（缺省/空跳过）。 */
function collectGridValues(ctx: QualityContext, family: 'grid' | 'matrix'): unknown[][][] {
  const result: unknown[][][] = []
  for (const ev of iterEvents(ctx)) {
    if (ev.type !== `${family}.create`) continue
    const values = (ev as { values?: unknown[][] }).values
    if (Array.isArray(values) && values.length > 0) result.push(values)
  }
  return result
}

/**
 * grid-uniform(error)：structuresCreated 含 'grid' 或 'matrix' 时，
 * 找到对应的 create 事件，将其 values 拉平后若全部相等则报错。
 * values 缺省 / 为空 / 拉平后为空时不报（无法判断，交由 empty-structure 等其它规则）。
 */
export const gridUniformRule: QualityRule = {
  id: 'grid-uniform',
  check(ctx) {
    const issues: QualityIssue[] = []
    for (const family of ['grid', 'matrix'] as const) {
      if (!ctx.structuresCreated.has(family)) continue
      for (const values of collectGridValues(ctx, family)) {
        const flat = values.flat()
        if (flat.length === 0) continue
        const allEqual = flat.every(v => Object.is(v, flat[0]))
        if (allEqual) {
          issues.push({
            code: 'grid-uniform',
            severity: 'error',
            message: `${family} 创建时所有单元格值都相同（${String(flat[0])}），无法体现网格内容。`,
            hint: `网格创建值全同，请在 ${family}.create 的 values 中传入真实的二维网格数据（不同单元格应有不同值，如陆地/海洋、障碍/通路），并在访问时用 ${family}.set_cell / ${family}.visit 等事件更新单元格状态。`,
          })
        }
      }
    }
    return issues
  },
}

/**
 * recursion-no-callstack(error，仅 recursion 类)：
 * 递归算法但 structuresCreated 不含 'callstack'。
 */
export const recursionNoCallStackRule: QualityRule = {
  id: 'recursion-no-callstack',
  appliesTo: ['recursion'],
  check(ctx) {
    if (ctx.structuresCreated.has('callstack')) return []
    return [
      {
        code: 'recursion-no-callstack',
        severity: 'error',
        message: '递归类算法未驱动调用栈（缺少 callstack 事件）。',
        hint: '递归算法必须用调用栈可视化递归过程：进入递归时发 callstack.create / callstack.push（压入当前帧与参数），返回时发 callstack.pop，使调用栈深度与递归深度一致。',
      },
    ]
  },
}

/** 通用质量规则聚合（注册顺序即报告顺序）。 */
export const GENERAL_RULES: QualityRule[] = [
  emptyStructureRule,
  noOperationsRule,
  emptyDescRule,
  lowCodeLineRule,
  gridUniformRule,
  recursionNoCallStackRule,
]
