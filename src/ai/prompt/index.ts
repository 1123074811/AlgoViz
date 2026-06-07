import type { AlgorithmCategory } from '../categories'
import { CORE_PROMPT } from './core'
// WS2 将补：import { CATEGORY_PROMPTS } from './categories'

/**
 * 装配生成器 system prompt。
 * Task 0：仅返回 core（其中暂含全部类别章节，行为与改造前一致）。
 * WS2：改为 core + CATEGORY_PROMPTS[category]，core 只保留通用部分。
 */
export function buildGeneratorSystemPrompt(language: string, category?: AlgorithmCategory): string {
  void category
  return CORE_PROMPT(language)
}
