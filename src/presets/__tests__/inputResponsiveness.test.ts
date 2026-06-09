import { describe, it, expect } from 'vitest'
import { generatePreset, PRESET_IDS } from '../generators'
import { parseAlgorithmInput, getLeetCodeDefault } from '@/utils/inputParser'

/**
 * 约束：每个算法的动画必须随输入动态同步——改输入则生成的脚本必须改变。
 * 做法：取算法的默认输入，与一份「变异输入」分别解析+生成,断言两份脚本不同。
 * 这道关卡守住「输入解析(按算法类型) → 生成器(真正使用输入)」整条链路。
 */

// 模板合集类：本身是固定示例集,无单一可变输入,豁免。
const WHITELIST = new Set(['leetcode_hot100', 'acm_templates'])

/** 产生与原输入“类型相同但内容不同”的变异输入。 */
function mutate(s: string): string {
  // 含带引号字符串(字符串类算法)：改第一个字符串内容。
  if (/"[^"]+"/.test(s)) return s.replace(/"([^"]+)"/, (_m, g: string) => `"${g}x"`)
  // 否则改第一个数字(覆盖数组首元素/n/权重/target 等)。
  const m = s.match(/-?\d+/)
  if (m) return s.replace(/-?\d+/, String(Number(m[0]) + 7))
  return `${s} `
}

function signature(script: ReturnType<typeof generatePreset>): string {
  return JSON.stringify(script?.steps ?? [])
}

describe('输入响应性约束：改输入 → 动画(脚本)必须改变', () => {
  for (const id of PRESET_IDS) {
    if (WHITELIST.has(id)) continue
    it(`${id} 随输入动态同步`, () => {
      const a = getLeetCodeDefault(id)
      const b = mutate(a)
      expect(b, `变异未改变输入: ${a}`).not.toBe(a)
      const scriptA = generatePreset(id, parseAlgorithmInput(a, 'leetcode', id))
      const scriptB = generatePreset(id, parseAlgorithmInput(b, 'leetcode', id))
      expect(
        signature(scriptA) !== signature(scriptB),
        `${id} 改输入后脚本未变化(可能生成器忽略了输入)`,
      ).toBe(true)
    })
  }
})
