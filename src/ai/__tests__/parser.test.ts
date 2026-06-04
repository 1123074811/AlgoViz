import { describe, it, expect } from 'vitest'
import { parseAIResponseDetailed } from '../parser'

// ─── Minimal valid script fixture ──────────────────────────────────────────

const minimalScript = {
  algorithm: 'bubble_sort',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  initialState: { type: 'array', data: [3, 1, 2] },
  steps: [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: '比较', en: 'compare' },
      action: { type: 'compare', targets: [0, 1], color: 'primary' },
      stats: { comparisons: 1, swaps: 0, accesses: 2 },
    },
  ],
}

const validJson = JSON.stringify(minimalScript)

// ─── Script with use_after_delete cross-step error ─────────────────────────
// The normalizer requires steps.events, but the cross-step check runs on
// the normalized script. We embed events directly so they survive normalizeStep.

const useAfterDeleteScript = {
  algorithm: 'test',
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(1)',
  },
  initialState: { type: 'linked_list', data: [1, 2] },
  steps: [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: '创建节点', en: 'create' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [
        {
          type: 'linked_list.create',
          variant: 'singly',
          nodes: [{ id: 'n1', value: 1, next: null }],
        },
      ],
    },
    {
      stepId: 2,
      codeLine: 1,
      description: { zh: '删除节点', en: 'delete' },
      action: { type: 'delete', targets: [], color: 'danger' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [{ type: 'linked_list.delete', nodeId: 'n1' }],
    },
    {
      stepId: 3,
      codeLine: 2,
      description: { zh: '访问已删除', en: 'visit deleted' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [{ type: 'linked_list.visit', nodeId: 'n1' }], // use_after_delete
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// parseAIResponseDetailed
// ═══════════════════════════════════════════════════════════════════════════

describe('parseAIResponseDetailed', () => {
  // 1. 合法 JSON 字符串 → success: true，script 非 null
  it('合法 JSON 字符串应返回 success:true，script 非 null', () => {
    const result = parseAIResponseDetailed(validJson)
    expect(result.success).toBe(true)
    expect(result.script).not.toBeNull()
    expect(result.script?.algorithm).toBe('bubble_sort')
  })

  // 2. markdown 代码块包裹的合法 JSON → success: true
  it('markdown 代码块包裹的合法 JSON 应返回 success:true', () => {
    const markdown = '以下是结果：\n```json\n' + validJson + '\n```\n'
    const result = parseAIResponseDetailed(markdown)
    expect(result.success).toBe(true)
    expect(result.script).not.toBeNull()
  })

  // 3. 非 JSON 字符串 → success: false，error 非空
  it('纯文本非 JSON 字符串应返回 success:false，error 非空', () => {
    const result = parseAIResponseDetailed('这是一段纯文字，没有任何 JSON 内容。')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  // 4. 包含 schema 错误（缺 algorithm）的 JSON → success: false
  it('缺少 algorithm 字段的 JSON 应返回 success:false', () => {
    const bad = {
      complexity: { time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
      initialState: { type: 'array', data: [1, 2] },
      steps: [
        {
          stepId: 1,
          codeLine: 0,
          description: { zh: '比较', en: 'compare' },
          action: { type: 'compare', targets: [0, 1], color: 'primary' },
          stats: { comparisons: 1, swaps: 0, accesses: 2 },
        },
      ],
    }
    const result = parseAIResponseDetailed(JSON.stringify(bad))
    expect(result.success).toBe(false)
  })

  // 5. 跨步语义不一致（use_after_delete）是非致命警告——脚本仍可渲染，应解析成功。
  // 这类启发式判定常误杀本可正常播放的脚本，因此降级为 warning/recoverable，
  // 不再阻断解析（详见 schema.ts validateCrossStepConsistency）。
  it('包含 use_after_delete 的脚本不应被判死，应返回 success:true', () => {
    const result = parseAIResponseDetailed(JSON.stringify(useAfterDeleteScript))
    expect(result.success).toBe(true)
    expect(result.script).not.toBeNull()
  })
})
