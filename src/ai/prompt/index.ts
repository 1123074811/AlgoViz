import type { AlgorithmCategory } from '../categories'
import { CORE_PROMPT } from './core'
import { CATEGORY_PROMPTS } from './categories'

export { CORE_PROMPT } from './core'
export { CATEGORY_PROMPTS } from './categories'
export type { AlgorithmCategory } from '../categories'

/**
 * 组装生成器系统提示词。
 *
 * - 传入 category：CORE_PROMPT + 该类别专属章节。
 * - 不传 category：CORE_PROMPT + 全部类别章节拼接（兼容旧的"无 category"行为，
 *   AI 能看到所有数据结构 builder 方法）。
 */
export function buildGeneratorSystemPrompt(language: string, category?: AlgorithmCategory): string {
  const core = CORE_PROMPT(language)
  if (category) {
    return core + '\n' + CATEGORY_PROMPTS[category]
  }
  const all = (Object.keys(CATEGORY_PROMPTS) as AlgorithmCategory[])
    .map(key => CATEGORY_PROMPTS[key])
    .join('\n\n')
  return core + '\n' + all
}
