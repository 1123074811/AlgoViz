import { describe, it, expect } from 'vitest'
import { attemptLocalRepair, buildRepairPrompt } from '../repair'
import type { AIErrorReport, AIValidationIssue } from '../errors'

function report(issues: AIValidationIssue[] = []): AIErrorReport {
  return {
    stage: 'json_parse',
    title: '测试',
    message: '测试',
    issues,
    suggestions: [],
    canRetry: true,
    rawResponse: '',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// attemptLocalRepair
// ═══════════════════════════════════════════════════════════════════════════

describe('attemptLocalRepair', () => {
  // 无 JSON 大括号 → 无法定位对象，返回 null
  it('完全没有 JSON 对象时返回 null', () => {
    expect(attemptLocalRepair('这是一段纯文字。', report())).toBeNull()
  })

  // 只有 '{' 没有 '}' → lastBrace 不大于 firstBrace，返回 null
  it('只有左大括号、缺少右大括号时返回 null', () => {
    expect(attemptLocalRepair('prefix { "a": 1 ', report())).toBeNull()
  })

  // 剥离 markdown 代码块 + 提取首个 JSON 对象，并补齐缺失字段
  it('剥离 markdown 代码块并补齐缺失的 complexity/stepId/stats/action/description', () => {
    const raw =
      '前缀说明\n```json\n' +
      JSON.stringify({
        algorithm: 'x',
        steps: [{ description: { zh: '步骤A', en: 'A' } }],
      }) +
      '\n```\n后缀'

    const result = attemptLocalRepair(raw, report())
    expect(result).not.toBeNull()
    const obj = JSON.parse(result!.repairedText) as Record<string, unknown>
    // complexity 被补齐为默认对象
    expect(obj.complexity).toEqual({
      time: { best: 'O(?)', average: 'O(?)', worst: 'O(?)' },
      space: 'O(?)',
    })
    const step = (obj.steps as Record<string, unknown>[])[0]
    // stepId 由索引补齐
    expect(step.stepId).toBe(1)
    // stats 被补齐
    expect(step.stats).toEqual({ comparisons: 0, swaps: 0, accesses: 0 })
    // action 缺失被补齐为默认 highlight
    expect(step.action).toEqual({ type: 'highlight', targets: [], color: 'primary' })
    // description.zh 已存在，被保留
    expect((step.description as Record<string, string>).zh).toBe('步骤A')
    // 至少修复了：剥离 code block + complexity + stepId + stats + action
    expect(result!.fixedIssues).toBeGreaterThanOrEqual(4)
  })

  // 提取首个 JSON 对象（前后有杂质文本，且无 code block）
  it('从夹杂噪声的文本中提取首个 JSON 对象', () => {
    const raw =
      'noise before { "algorithm": "y", "complexity": {"time":{},"space":"O(1)"}, "steps": [{"stepId": 7, "action": {"type":"swap","color":"success"}, "stats":{"comparisons":0,"swaps":0,"accesses":0}, "description":{"zh":"z","en":"z"}}] } noise after'
    const result = attemptLocalRepair(raw, report())
    expect(result).not.toBeNull()
    const obj = JSON.parse(result!.repairedText) as Record<string, unknown>
    expect(obj.algorithm).toBe('y')
    const step = (obj.steps as Record<string, unknown>[])[0]
    // 已有 stepId 被保留（不是索引+1）
    expect(step.stepId).toBe(7)
    // 提取动作至少计入一次修复
    expect(result!.fixedIssues).toBeGreaterThanOrEqual(1)
  })

  // 尾随逗号 → JSON.parse 失败后清洗救回
  it('清洗对象/数组尾随逗号后救回', () => {
    const raw =
      '{ "algorithm": "tc", "complexity": {"time":{},"space":"O(1)"}, "steps": [{"stepId":1,"action":{"type":"highlight","color":"primary"},"stats":{"comparisons":0,"swaps":0,"accesses":0},"description":{"zh":"a","en":"a"}},] }'
    const result = attemptLocalRepair(raw, report())
    expect(result).not.toBeNull()
    const obj = JSON.parse(result!.repairedText) as Record<string, unknown>
    expect(obj.algorithm).toBe('tc')
  })

  // 清洗尾随逗号后仍非法 → 返回 null
  it('清洗尾随逗号后仍无法解析时返回 null', () => {
    const raw = '{ "algorithm": "x" "missing": comma }'
    expect(attemptLocalRepair(raw, report())).toBeNull()
  })

  // steps 不是数组 → 关键字段无法修复，返回 null
  it('steps 不是数组时返回 null', () => {
    const raw = JSON.stringify({ algorithm: 'x', complexity: { time: {}, space: 'O(1)' }, steps: 'nope' })
    expect(attemptLocalRepair(raw, report())).toBeNull()
  })

  // action 存在但 color 非字符串 → 补默认 color
  it('action 存在但 color 非字符串时补默认 primary', () => {
    const raw = JSON.stringify({
      algorithm: 'x',
      complexity: { time: {}, space: 'O(1)' },
      steps: [
        {
          stepId: 1,
          action: { type: 'swap', color: 123 },
          stats: { comparisons: 0, swaps: 0, accesses: 0 },
          description: { zh: 'a', en: 'a' },
        },
      ],
    })
    const result = attemptLocalRepair(raw, report())
    expect(result).not.toBeNull()
    const obj = JSON.parse(result!.repairedText) as Record<string, unknown>
    const action = (obj.steps as Record<string, unknown>[])[0].action as Record<string, unknown>
    expect(action.color).toBe('primary')
  })

  // complexity 已存在且合法 → 不重复修复；description.zh 已存在 → 不覆盖
  it('已有合法 complexity 与 description 时不计入修复', () => {
    const raw = JSON.stringify({
      algorithm: 'x',
      complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
      steps: [
        {
          stepId: 1,
          action: { type: 'swap', color: 'success' },
          stats: { comparisons: 0, swaps: 0, accesses: 0 },
          description: { zh: '保留', en: 'keep' },
        },
      ],
    })
    const result = attemptLocalRepair(raw, report())
    expect(result).not.toBeNull()
    // 直接 JSON、无 code block、无尾随逗号、无缺字段 → 0 次修复
    expect(result!.fixedIssues).toBe(0)
    const obj = JSON.parse(result!.repairedText) as Record<string, unknown>
    expect((obj.steps as Record<string, unknown>[])[0].description).toEqual({ zh: '保留', en: 'keep' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// buildRepairPrompt
// ═══════════════════════════════════════════════════════════════════════════

describe('buildRepairPrompt', () => {
  it('包含错误报告中每条 issue 的 path/message 与建议', () => {
    const r = report([
      { path: 'steps[0].action', code: 'required', message: '缺少 action', suggestion: '补齐 action', severity: 'error', recoverable: false },
      { path: 'algorithm', code: 'required', message: '缺少 algorithm', severity: 'error', recoverable: false },
    ])
    const prompt = buildRepairPrompt('{"algorithm":"x"}', r)
    expect(prompt).toContain('steps[0].action: 缺少 action')
    expect(prompt).toContain('(建议: 补齐 action)')
    // 没有 suggestion 的 issue 不应带括号建议
    expect(prompt).toContain('algorithm: 缺少 algorithm')
    expect(prompt).toContain('{"algorithm":"x"}')
  })

  it('原始内容超过 3000 字符时截断并标注', () => {
    const long = 'x'.repeat(3500)
    const prompt = buildRepairPrompt(long, report())
    expect(prompt).toContain('...(已截断)')
    expect(prompt).toContain('x'.repeat(3000))
    // 不应包含完整 3500 长度
    expect(prompt).not.toContain('x'.repeat(3001))
  })

  it('原始内容不超过 3000 字符时原样保留', () => {
    const short = 'short content'
    const prompt = buildRepairPrompt(short, report())
    expect(prompt).toContain('short content')
    expect(prompt).not.toContain('...(已截断)')
  })
})
