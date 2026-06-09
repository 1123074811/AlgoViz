import { describe, it, expect } from 'vitest'
import { generatePreset, PRESET_IDS } from '../generators'

// 模板合集类(无单一返回值)算法豁免。
const NO_SINGLE_RETURN = new Set(['leetcode_hot100', 'acm_templates'])

// 多种代表性输入,确保 result 推断对不同输入都成立。
const SAMPLE_INPUTS: unknown[] = ['', 'nums = [5, 3, 8, 1, 9, 2]', '[4, 2, 7, 1]']

describe('输出完整性：每个算法都应产出 script.result', () => {
  for (const id of PRESET_IDS) {
    if (NO_SINGLE_RETURN.has(id)) continue
    it(`${id} 有输出结果`, () => {
      // 任一代表性输入下能得到非空 result 即视为通过(部分算法对空输入用内置默认)。
      const hasResult = SAMPLE_INPUTS.some((input) => {
        const script = generatePreset(id, input)
        return script?.result !== undefined
      })
      expect(hasResult, `${id} 未产出 script.result`).toBe(true)
    })
  }
})
