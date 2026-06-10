import { describe, it, expect } from 'vitest'
import { validateAnimationScript, normalizeAnimationScript } from '../schema'

const base = {
  algorithm: 'x',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
}

function withSteps(initialState: unknown, steps: unknown[]) {
  return { ...base, initialState, steps }
}

const trivialStep = {
  stepId: 1,
  codeLine: 0,
  description: { zh: 'a', en: 'a' },
  action: { type: 'highlight', targets: [], color: 'primary' },
  stats: { comparisons: 0, swaps: 0, accesses: 0 },
}

// ═══════════════════════════════════════════════════════════════════════════
// validateAnimationScript — top-level & complexity branches
// ═══════════════════════════════════════════════════════════════════════════

describe('validateAnimationScript top-level branches', () => {
  it('非对象根值 → invalid_root', () => {
    const issues = validateAnimationScript('not an object')
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('invalid_root')
  })

  it('complexity 缺失 time、space 非字符串 → required + warning invalid', () => {
    const issues = validateAnimationScript({
      ...base,
      complexity: { space: 42 },
      initialState: { type: 'array', data: [1] },
      steps: [trivialStep],
    })
    expect(issues.find(i => i.path === 'complexity.time' && i.code === 'required')).toBeDefined()
    const spaceIssue = issues.find(i => i.path === 'complexity.space')
    expect(spaceIssue?.severity).toBe('warning')
    expect(spaceIssue?.recoverable).toBe(true)
  })

  it('complexity 非对象 → complexity required', () => {
    const issues = validateAnimationScript({ ...base, complexity: 'O(1)', initialState: { type: 'array', data: [1] }, steps: [trivialStep] })
    expect(issues.find(i => i.path === 'complexity' && i.code === 'required')).toBeDefined()
  })

  it('initialState 非对象 → initialState required', () => {
    const issues = validateAnimationScript({ ...base, initialState: 'array', steps: [trivialStep] })
    expect(issues.find(i => i.path === 'initialState' && i.code === 'required')).toBeDefined()
  })

  it('presentation 非对象 → warning invalid_type', () => {
    const issues = validateAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), presentation: 'classic' })
    const p = issues.find(i => i.path === 'presentation')
    expect(p?.severity).toBe('warning')
    expect(p?.recoverable).toBe(true)
  })

  it('presentation.engine 非法值 → invalid_type error', () => {
    const issues = validateAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), presentation: { engine: 'wild' } })
    expect(issues.find(i => i.path === 'presentation.engine' && i.code === 'invalid_type')).toBeDefined()
  })

  it('presentation.engine 合法 scene → 无相关 error', () => {
    const issues = validateAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), presentation: { engine: 'scene' } })
    expect(issues.find(i => i.path === 'presentation.engine')).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// initialState — graph / tree / matrix branches
// ═══════════════════════════════════════════════════════════════════════════

describe('validateInitialState branches', () => {
  it('无效 type → invalid_type 并提前返回', () => {
    const issues = validateAnimationScript(withSteps({ type: 'bogus', data: [1] }, [trivialStep]))
    expect(issues.find(i => i.path === 'initialState.type' && i.code.startsWith('invalid_type'))).toBeDefined()
  })

  it('graph 缺少 nodes → required', () => {
    const issues = validateAnimationScript(withSteps({ type: 'graph', data: [] }, [trivialStep]))
    expect(issues.find(i => i.path === 'initialState.nodes' && i.code === 'required')).toBeDefined()
  })

  it('graph 节点 id 非字符串 → invalid_type', () => {
    const issues = validateAnimationScript(withSteps({ type: 'graph', data: [], nodes: [{ id: 5 }] }, [trivialStep]))
    expect(issues.find(i => i.path === 'initialState.nodes[0].id' && i.code === 'invalid_type')).toBeDefined()
  })

  it('graph 边非对象 / source 非字符串 / target 非字符串', () => {
    const issuesNonObj = validateAnimationScript(withSteps({ type: 'graph', data: [], nodes: [{ id: 'A' }], edges: ['bad'] }, [trivialStep]))
    expect(issuesNonObj.find(i => i.path === 'initialState.edges[0]' && i.code === 'invalid_type')).toBeDefined()

    const issuesSrc = validateAnimationScript(withSteps({ type: 'graph', data: [], nodes: [{ id: 'A' }], edges: [{ source: 1, target: 'A' }] }, [trivialStep]))
    expect(issuesSrc.find(i => i.path === 'initialState.edges[0].source' && i.code === 'invalid_type')).toBeDefined()

    const issuesTgt = validateAnimationScript(withSteps({ type: 'graph', data: [], nodes: [{ id: 'A' }], edges: [{ source: 'A', target: 2 }] }, [trivialStep]))
    expect(issuesTgt.find(i => i.path === 'initialState.edges[0].target' && i.code === 'invalid_type')).toBeDefined()
  })

  it('graph 合法 edges 引用存在节点 → 无 invalid_ref', () => {
    const issues = validateAnimationScript(withSteps({ type: 'graph', data: [], nodes: [{ id: 'A' }, { id: 'B' }], edges: [{ source: 'A', target: 'B' }] }, [trivialStep]))
    expect(issues.find(i => i.code === 'invalid_ref')).toBeUndefined()
  })

  it('tree 缺少 root 与 children → 两条 required', () => {
    const issues = validateAnimationScript(withSteps({ type: 'tree', data: [] }, [trivialStep]))
    expect(issues.find(i => i.path === 'initialState.root' && i.code === 'required')).toBeDefined()
    expect(issues.find(i => i.path === 'initialState.children' && i.code === 'required')).toBeDefined()
  })

  it('matrix 行长度不一致 → inconsistent', () => {
    const issues = validateAnimationScript(withSteps({ type: 'matrix', data: [[1, 2], [3]] }, [trivialStep]))
    expect(issues.find(i => i.code === 'inconsistent')).toBeDefined()
  })

  it('matrix 使用 matrix 字段且行一致 → 无 inconsistent', () => {
    const issues = validateAnimationScript(withSteps({ type: 'matrix', matrix: [[1, 2], [3, 4]] }, [trivialStep]))
    expect(issues.find(i => i.code === 'inconsistent')).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// validateSteps branches
// ═══════════════════════════════════════════════════════════════════════════

describe('validateSteps branches', () => {
  it('步骤非对象 → invalid', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [42]))
    expect(issues.find(i => i.path === 'steps[0]' && i.code === 'invalid')).toBeDefined()
  })

  it('步骤缺 action → required', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [{ description: { zh: 'a' } }]))
    expect(issues.find(i => i.path === 'steps[0].action' && i.code === 'required')).toBeDefined()
  })

  it('action.type 非法 → warning invalid_type', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [{ description: { zh: 'a' }, action: { type: 'bogus' } }]))
    const t = issues.find(i => i.path === 'steps[0].action.type')
    expect(t?.severity).toBe('warning')
  })

  it('action.targets 非数字数组 → invalid_type error', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [{ description: { zh: 'a' }, action: { type: 'highlight', targets: ['x'] } }]))
    expect(issues.find(i => i.path === 'steps[0].action.targets' && i.code === 'invalid_type')).toBeDefined()
  })

  it('step.events 非数组 → invalid_type', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [{ description: { zh: 'a' }, action: { type: 'highlight', targets: [] }, events: 'x' }]))
    expect(issues.find(i => i.path === 'steps[0].events' && i.code === 'invalid_type')).toBeDefined()
  })

  it('swaps 倒退 → non_monotonic warning', () => {
    const issues = validateAnimationScript(withSteps({ type: 'array', data: [1] }, [
      { ...trivialStep, stats: { comparisons: 0, swaps: 5, accesses: 0 } },
      { ...trivialStep, stepId: 2, stats: { comparisons: 0, swaps: 2, accesses: 0 } },
    ]))
    expect(issues.find(i => i.path === 'steps[1].stats.swaps' && i.code === 'non_monotonic')).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// validateEvent branches (exercised via validateAnimationScript)
// ═══════════════════════════════════════════════════════════════════════════

function withEvent(event: unknown) {
  return withSteps({ type: 'array', data: [1] }, [
    { ...trivialStep, events: [event] },
  ])
}

describe('validateEvent branches', () => {
  it('event 非对象 → invalid_type', () => {
    const issues = validateAnimationScript(withEvent(99))
    expect(issues.find(i => i.code === 'invalid_type' && i.message.includes('event 必须是对象'))).toBeDefined()
  })

  it('未知 event.type → 白名单 invalid_type', () => {
    const issues = validateAnimationScript(withEvent({ type: 'unknown.event' }))
    expect(issues.find(i => i.path.endsWith('.type') && i.message.includes('白名单'))).toBeDefined()
  })

  it('linked_list.create 缺 variant 与 nodes → 两条 required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'linked_list.create' }))
    expect(issues.find(i => i.path.endsWith('.variant') && i.code === 'required')).toBeDefined()
    expect(issues.find(i => i.path.endsWith('.nodes') && i.code === 'required')).toBeDefined()
  })

  it('linked_list.insert_after 缺 targetNodeId / newNode → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'linked_list.insert_after' }))
    expect(issues.find(i => i.path.endsWith('.targetNodeId'))).toBeDefined()
    expect(issues.find(i => i.path.endsWith('.newNode'))).toBeDefined()
  })

  it('linked_list.delete 缺 nodeId → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'linked_list.delete' }))
    expect(issues.find(i => i.path.endsWith('.nodeId') && i.code === 'required')).toBeDefined()
  })

  it('linked_list.move_pointer 缺 pointerId → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'linked_list.move_pointer' }))
    expect(issues.find(i => i.path.endsWith('.pointerId'))).toBeDefined()
  })

  it('tree.rotate 非法 rotation 与缺 pivotId → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'tree.rotate', rotation: 'spin' }))
    expect(issues.find(i => i.path.endsWith('.rotation'))).toBeDefined()
    expect(issues.find(i => i.path.endsWith('.pivotId'))).toBeDefined()
  })

  it('array.swap 缺合法 indices → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'array.swap', indices: [0] }))
    expect(issues.find(i => i.path.endsWith('.indices') && i.code === 'required')).toBeDefined()
  })

  it('array.window indices 含非数字 → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'array.window', indices: [0, 'x'] }))
    expect(issues.find(i => i.path.endsWith('.indices'))).toBeDefined()
  })

  it('graph.create 缺 nodes/edges → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'graph.create', nodes: [] }))
    expect(issues.find(i => i.path.endsWith('.nodes'))).toBeDefined()
    expect(issues.find(i => i.path.endsWith('.edges'))).toBeDefined()
  })

  it('graph.visit_node 缺 nodeId → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'graph.visit_node' }))
    expect(issues.find(i => i.path.endsWith('.nodeId'))).toBeDefined()
  })

  it('graph.visit_edge 缺 source/target → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'graph.visit_edge' }))
    expect(issues.find(i => i.path.endsWith('.source'))).toBeDefined()
    expect(issues.find(i => i.path.endsWith('.target'))).toBeDefined()
  })

  it('n_queens.try_place 缺 row/col → required', () => {
    const issues = validateAnimationScript(withEvent({ type: 'n_queens.try_place' }))
    expect(issues.find(i => i.message.includes('row 和 col'))).toBeDefined()
  })

  it('n_queens.solution 不要求 row/col', () => {
    const issues = validateAnimationScript(withEvent({ type: 'n_queens.solution' }))
    expect(issues.find(i => i.message.includes('row 和 col'))).toBeUndefined()
  })

  it('queue.create 缺 values → required；queue.enqueue 缺 value → required', () => {
    const issuesCreate = validateAnimationScript(withEvent({ type: 'queue.create' }))
    expect(issuesCreate.find(i => i.path.endsWith('.values'))).toBeDefined()
    const issuesEnq = validateAnimationScript(withEvent({ type: 'queue.enqueue' }))
    expect(issuesEnq.find(i => i.path.endsWith('.value'))).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizeAnimationScript branches
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeAnimationScript branches', () => {
  it('initialState 缺失 → null', () => {
    expect(normalizeAnimationScript({ ...base, steps: [trivialStep] })).toBeNull()
  })

  it('steps 规范化后为空 → null', () => {
    expect(normalizeAnimationScript(withSteps({ type: 'array', data: [1] }, [{ no: 'action' }]))).toBeNull()
  })

  it('matrix 类型用 data 二维数组 → 保留 matrix 与扁平 data', () => {
    const result = normalizeAnimationScript(withSteps({ type: 'matrix', data: [[1, 2], [3, 4]] }, [trivialStep]))
    expect(result?.initialState.matrix).toEqual([[1, 2], [3, 4]])
    expect(result?.initialState.data).toEqual([1, 2, 3, 4])
  })

  it('matrix 类型用 matrix 字段 → 数字化并扁平', () => {
    const result = normalizeAnimationScript(withSteps({ type: 'matrix', matrix: [['1', '2'], ['3', '4']] }, [trivialStep]))
    expect(result?.initialState.matrix).toEqual([[1, 2], [3, 4]])
  })

  it('未知 type 回退为 array；空 data 的 array → null', () => {
    expect(normalizeAnimationScript(withSteps({ type: 'bogus', data: [] }, [trivialStep]))).toBeNull()
  })

  it('tree 类型由 children 生成 treeNodes（含数值/字符串值）', () => {
    const result = normalizeAnimationScript(
      withSteps({ type: 'tree', root: '1', children: { '1': ['2', 'leaf'] } }, [trivialStep]),
    )
    const treeNodes = result?.initialState.treeNodes
    expect(treeNodes).toBeDefined()
    const ids = treeNodes!.map(n => n.id).sort()
    expect(ids).toEqual(['1', '2', 'leaf'])
    const numeric = treeNodes!.find(n => n.id === '2')
    expect(numeric?.value).toBe(2)
    const strNode = treeNodes!.find(n => n.id === 'leaf')
    expect(strNode?.value).toBe('leaf')
  })

  it('保留 result 标量与数组（过滤非法元素）', () => {
    const scalar = normalizeAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), result: 42 })
    expect(scalar?.result).toBe(42)

    const arr = normalizeAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), result: [1, 'a', { x: 1 }] })
    expect(arr?.result).toEqual([1, 'a'])

    const emptyArr = normalizeAnimationScript({ ...withSteps({ type: 'array', data: [1] }, [trivialStep]), result: [{ x: 1 }] })
    expect(emptyArr?.result).toBeUndefined()
  })

  it('保留 presentation（engine/module/variant/layout）', () => {
    const result = normalizeAnimationScript({
      ...withSteps({ type: 'array', data: [1] }, [trivialStep]),
      presentation: { engine: 'scene', module: 'sorting', variant: 'v1', layout: 'grid', extra: 'drop' },
    })
    expect(result?.presentation).toEqual({ engine: 'scene', module: 'sorting', variant: 'v1', layout: 'grid' })
  })

  it('presentation 全部字段缺失/非法 → 不输出 presentation', () => {
    const result = normalizeAnimationScript({
      ...withSteps({ type: 'array', data: [1] }, [trivialStep]),
      presentation: { engine: 'bogus' },
    })
    expect(result?.presentation).toBeUndefined()
  })

  it('normalizeStep：非法 action.type 回退 highlight，非法 color 回退 primary，targets 数字化过滤', () => {
    const result = normalizeAnimationScript(withSteps({ type: 'array', data: [1] }, [
      {
        stepId: 3,
        action: { type: 'bogus', color: 'rainbow', targets: [0, '1', 'x'], from: 0, to: 1, value: 'v' },
        stats: { comparisons: 2, swaps: 1, accesses: 4 },
        description: { zh: '描述' },
        codeLine: -5,
      },
    ]))
    const step = result!.steps[0]
    expect(step.action.type).toBe('highlight')
    expect(step.action.color).toBe('primary')
    expect(step.action.targets).toEqual([0, 1])
    expect(step.action.value).toBe('v')
    // codeLine 负数被夹紧到 0
    expect(step.codeLine).toBe(0)
    // description.en 缺失时回退为 zh
    expect(step.description.en).toBe('描述')
    expect(step.stats).toEqual({ comparisons: 2, swaps: 1, accesses: 4 })
  })
})
