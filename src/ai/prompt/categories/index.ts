import { PROMPT as linear } from './linear'
import { PROMPT as recursion } from './recursion'
import { PROMPT as grid } from './grid'
import { PROMPT as graph } from './graph'
import { PROMPT as tree } from './tree'
import { PROMPT as dp } from './dp'
import { PROMPT as structure } from './structure'
import type { AlgorithmCategory } from '../../categories'

/** 各类别专属的提示词章节，按 category 装配。 */
export const CATEGORY_PROMPTS: Record<AlgorithmCategory, string> = {
  linear,
  recursion,
  grid,
  graph,
  tree,
  dp,
  structure,
}
