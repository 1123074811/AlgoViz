import { describe, it, expect } from 'vitest'
import { parseAIResponseDetailed } from '../parser'
import { buildFallbackScene } from '../fallbackScene'
import { validateAnimationScript } from '../schema'

const DIRTY_INPUTS: string[] = [
  '',                                   // 空
  'not json at all',                    // 纯文本
  '```json\n{ broken',                  // 截断 code block
  '{ "algorithm": "x" }',               // 缺字段
  '抱歉，我无法分析这段代码',              // 模型拒答
  '{ "algorithm": "x", }',              // 尾随逗号 + 缺字段
  '{}',                                 // 空对象
  'null',                               // 合法 JSON 但非对象
]

describe('稳定性语料：脏输入永不导致空白/崩溃', () => {
  for (const raw of DIRTY_INPUTS) {
    it(`脏输入 [${raw.slice(0, 16)}...] 要么解析成功要么有合法 fallback`, () => {
      const result = parseAIResponseDetailed(raw)
      const script = result.success && result.script
        ? result.script
        : buildFallbackScene({ type: 'array', data: [3, 1, 2] }, { kind: 'parse', message: '解析失败' })
      // 任一路径都必须产出 steps 非空的合法脚本
      expect(script.steps.length).toBeGreaterThan(0)
      const issues = validateAnimationScript(script)
      expect(issues.some(i => i.severity === 'error')).toBe(false)
    })
  }
})
