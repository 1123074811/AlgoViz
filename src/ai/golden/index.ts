import { GOLDEN as LINEAR } from './linear'
import { GOLDEN as RECURSION } from './recursion'
import { GOLDEN as GRID } from './grid'
import { GOLDEN as GRAPH } from './graph'
import { GOLDEN as TREE } from './tree'
import { GOLDEN as DP } from './dp'
import { GOLDEN as STRUCTURE } from './structure'
import type { AlgorithmCategory } from '../categories'

export type { AlgorithmCategory } from '../categories'

/**
 * 各类别金样例生成器源码（一段可在沙箱中以 `input` + `b` 执行的 JS 字符串）。
 * 用作 few-shot 示例 / 质量回归基线 / WS6 离线评测夹具。
 */
export const GOLDEN_GENERATORS: Record<AlgorithmCategory, string> = {
  linear: LINEAR,
  recursion: RECURSION,
  grid: GRID,
  graph: GRAPH,
  tree: TREE,
  dp: DP,
  structure: STRUCTURE,
}
