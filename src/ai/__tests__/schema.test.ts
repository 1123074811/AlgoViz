import { describe, it, expect } from 'vitest'
import {
  validateAnimationScript,
  validateCrossStepConsistency,
  normalizeAnimationScript,
} from '../schema'
import type { AnimationStep } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'

// ─── Minimal valid array script fixture ────────────────────────────────────

const minimalArrayScript = {
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

// ─── Helper to build an AnimationStep ──────────────────────────────────────

function makeStep(overrides: Partial<AnimationStep> = {}): AnimationStep {
  return {
    stepId: 1,
    codeLine: 0,
    description: { zh: '操作', en: 'op' },
    action: { type: 'highlight', targets: [], color: 'primary' },
    stats: { comparisons: 0, swaps: 0, accesses: 0 },
    events: [],
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// validateAnimationScript
// ═══════════════════════════════════════════════════════════════════════════

describe('validateAnimationScript', () => {
  // 1. 空对象 → algorithm required issue
  it('空对象应返回包含 algorithm required 的 issue', () => {
    const issues = validateAnimationScript({})
    const codes = issues.map(i => i.code)
    expect(codes).toContain('required')
    const algorithmIssue = issues.find(i => i.path === 'algorithm')
    expect(algorithmIssue).toBeDefined()
  })

  // 2. 缺 steps
  it('缺少 steps 字段时应返回相关 issue', () => {
    const raw = { ...minimalArrayScript }
    const { steps: _steps, ...noSteps } = raw
    const issues = validateAnimationScript(noSteps)
    const stepIssue = issues.find(i => i.path === 'steps')
    expect(stepIssue).toBeDefined()
  })

  // 3. steps 为空数组
  it('steps 为空数组时应返回 empty issue', () => {
    const issues = validateAnimationScript({ ...minimalArrayScript, steps: [] })
    const emptyIssue = issues.find(i => i.path === 'steps' && i.code === 'empty')
    expect(emptyIssue).toBeDefined()
  })

  // 4. 最小合法 array script → issues 为空或只有 warning
  it('合法的最小 array script 不应有 error 级 issue', () => {
    const issues = validateAnimationScript(minimalArrayScript)
    const errors = issues.filter(i => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  // 5. graph 类型：edge 引用不存在的 nodeId → invalid_ref
  it('graph 类型 edge 引用不存在的节点时应报 invalid_ref', () => {
    const graphScript = {
      ...minimalArrayScript,
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'A', label: 'A' }],
        edges: [{ source: 'A', target: 'NONEXISTENT' }],
      },
    }
    const issues = validateAnimationScript(graphScript)
    const refIssue = issues.find(i => i.code === 'invalid_ref')
    expect(refIssue).toBeDefined()
  })

  // 6. steps 中 comparisons 倒退 → non_monotonic warning
  it('comparisons 倒退时应报 non_monotonic warning', () => {
    const script = {
      ...minimalArrayScript,
      steps: [
        {
          stepId: 1,
          codeLine: 0,
          description: { zh: '步骤1', en: 'step1' },
          action: { type: 'compare', targets: [0, 1], color: 'primary' },
          stats: { comparisons: 5, swaps: 0, accesses: 2 },
        },
        {
          stepId: 2,
          codeLine: 1,
          description: { zh: '步骤2', en: 'step2' },
          action: { type: 'compare', targets: [1, 2], color: 'primary' },
          stats: { comparisons: 3, swaps: 0, accesses: 2 }, // ← 倒退
        },
      ],
    }
    const issues = validateAnimationScript(script)
    const monotonic = issues.find(i => i.code === 'non_monotonic' && i.severity === 'warning')
    expect(monotonic).toBeDefined()
  })

  it('queue 事件应通过校验并在规范化后保留', () => {
    const script = {
      ...minimalArrayScript,
      steps: [
        {
          stepId: 1,
          codeLine: 0,
          description: { zh: '初始化队列', en: 'create queue' },
          action: { type: 'highlight', targets: [], color: 'primary' },
          stats: { comparisons: 0, swaps: 0, accesses: 0 },
          events: [{ type: 'queue.create', values: [] }],
        },
        {
          stepId: 2,
          codeLine: 1,
          description: { zh: '入队', en: 'enqueue' },
          action: { type: 'insert', targets: [], color: 'success' },
          stats: { comparisons: 0, swaps: 0, accesses: 1 },
          events: [{ type: 'queue.enqueue', value: 1 }],
        },
      ],
    }

    expect(validateAnimationScript(script).filter(i => i.severity === 'error')).toHaveLength(0)
    expect(normalizeAnimationScript(script)?.steps[1].events?.[0].type).toBe('queue.enqueue')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// validateCrossStepConsistency
// ═══════════════════════════════════════════════════════════════════════════

describe('validateCrossStepConsistency', () => {
  // 7. linked_list.create 两次（无 delete）→ duplicate_create
  it('同一节点 linked_list.create 两次（无 delete）→ duplicate_create', () => {
    const steps: AnimationStep[] = [
      makeStep({
        stepId: 1,
        events: [
          {
            type: 'linked_list.create',
            variant: 'singly',
            nodes: [{ id: 'n1', value: 1, next: null }],
          } as unknown as AlgorithmEvent,
        ],
      }),
      makeStep({
        stepId: 2,
        events: [
          {
            type: 'linked_list.create',
            variant: 'singly',
            nodes: [{ id: 'n1', value: 2, next: null }], // 同 id n1 再创建
          } as unknown as AlgorithmEvent,
        ],
      }),
    ]
    const issues = validateCrossStepConsistency(steps, 'linked_list')
    const dup = issues.find(i => i.code === 'duplicate_create')
    expect(dup).toBeDefined()
    // 非致命：降级为 warning/recoverable，不阻断解析
    expect(dup?.severity).toBe('warning')
    expect(dup?.recoverable).toBe(true)
  })

  // 8. delete 后仍 visit → use_after_delete
  it('linked_list.delete 后仍 linked_list.visit 同节点 → use_after_delete', () => {
    const steps: AnimationStep[] = [
      makeStep({
        stepId: 1,
        events: [
          {
            type: 'linked_list.create',
            variant: 'singly',
            nodes: [{ id: 'n2', value: 1, next: null }],
          } as unknown as AlgorithmEvent,
        ],
      }),
      makeStep({
        stepId: 2,
        events: [
          { type: 'linked_list.delete', nodeId: 'n2' } as unknown as AlgorithmEvent,
        ],
      }),
      makeStep({
        stepId: 3,
        events: [
          { type: 'linked_list.visit', nodeId: 'n2' } as unknown as AlgorithmEvent, // 已删除，再访问
        ],
      }),
    ]
    const issues = validateCrossStepConsistency(steps, 'linked_list')
    const uad = issues.find(i => i.code === 'use_after_delete')
    expect(uad).toBeDefined()
    expect(uad?.severity).toBe('warning')
    expect(uad?.recoverable).toBe(true)
  })

  // 9. tree.rotate 的 pivotId 未创建 → rotate_invalid_node
  it('tree.rotate 的 pivotId 未创建时 → rotate_invalid_node', () => {
    const steps: AnimationStep[] = [
      makeStep({
        stepId: 1,
        events: [
          {
            type: 'tree.rotate',
            rotation: 'left',
            pivotId: 'ghost_node', // 从未创建过
          } as unknown as AlgorithmEvent,
        ],
      }),
    ]
    const issues = validateCrossStepConsistency(steps, 'tree')
    expect(issues.some(i => i.code === 'rotate_invalid_node')).toBe(true)
  })

  // 10. 正常生命周期（create → visit → delete → 不再引用）→ 空数组
  it('正常生命周期 create→visit→delete 应返回空数组', () => {
    const steps: AnimationStep[] = [
      makeStep({
        stepId: 1,
        events: [
          {
            type: 'linked_list.create',
            variant: 'singly',
            nodes: [{ id: 'n3', value: 1, next: null }],
          } as unknown as AlgorithmEvent,
        ],
      }),
      makeStep({
        stepId: 2,
        events: [
          { type: 'linked_list.visit', nodeId: 'n3' } as unknown as AlgorithmEvent,
        ],
      }),
      makeStep({
        stepId: 3,
        events: [
          { type: 'linked_list.delete', nodeId: 'n3' } as unknown as AlgorithmEvent,
        ],
      }),
    ]
    const issues = validateCrossStepConsistency(steps, 'linked_list')
    expect(issues).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizeAnimationScript
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeAnimationScript', () => {
  // 11. null 输入 → null
  it('null 输入应返回 null', () => {
    expect(normalizeAnimationScript(null)).toBeNull()
  })

  // 12. 合法输入 → 返回对象，algorithm 字段正确
  it('合法输入应返回对象，algorithm 字段正确', () => {
    const result = normalizeAnimationScript(minimalArrayScript)
    expect(result).not.toBeNull()
    expect(result?.algorithm).toBe('bubble_sort')
  })

  // 13. data 不合法的 array 类型（空 data）→ null
  it('array 类型 data 为空时应返回 null', () => {
    const invalid = {
      ...minimalArrayScript,
      initialState: { type: 'array', data: [] },
    }
    const result = normalizeAnimationScript(invalid)
    expect(result).toBeNull()
  })
})
