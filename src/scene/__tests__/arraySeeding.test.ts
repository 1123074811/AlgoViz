import { describe, it, expect } from 'vitest'
import { deriveSceneState } from '../SceneEngine'
import type { AnimationScript } from '@/types/animation'

// 数组脚本：步骤里只有 array.compare，没有 array.create（模拟 AI 漏发 create 的情况）
const arrayScriptNoCreate: AnimationScript = {
  algorithm: 'bubble_sort',
  complexity: { time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' }, space: 'O(1)' },
  initialState: { type: 'array', data: [5, 3, 8] },
  steps: [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: '比较', en: 'cmp' },
      action: { type: 'compare', targets: [0, 1], color: 'warning' },
      stats: { comparisons: 1, swaps: 0, accesses: 2 },
      events: [{ type: 'array.compare', indices: [0, 1] }],
    },
  ],
}

describe('deriveSceneState — array seeding fallback', () => {
  it('数组脚本即使缺少 array.create，也从 initialState.data 播种格子', () => {
    const scene = deriveSceneState(arrayScriptNoCreate, 0)
    const cellIds = Object.keys(scene.entities).filter((k) => k.startsWith('arr_'))
    expect(cellIds).toHaveLength(3)
    expect(scene.entities['arr_0']?.type).toBe('cell')
  })

  it('播种格子的值与 initialState.data 对齐', () => {
    const scene = deriveSceneState(arrayScriptNoCreate, 0)
    const cell0 = scene.entities['arr_0']
    const cell2 = scene.entities['arr_2']
    expect(cell0?.type === 'cell' ? cell0.value : null).toBe(5)
    expect(cell2?.type === 'cell' ? cell2.value : null).toBe(8)
  })

  it('空 data 数组不播种任何格子', () => {
    const empty: AnimationScript = {
      ...arrayScriptNoCreate,
      initialState: { type: 'array', data: [] },
    }
    const scene = deriveSceneState(empty, 0)
    const cellIds = Object.keys(scene.entities).filter((k) => k.startsWith('arr_'))
    expect(cellIds).toHaveLength(0)
  })

  it('非数组类型（如 graph）不受播种影响', () => {
    const graphScript: AnimationScript = {
      algorithm: 'bfs_graph',
      complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
      initialState: { type: 'graph', data: [], nodes: [{ id: 'A' }], edges: [] },
      steps: [
        {
          stepId: 1,
          codeLine: 0,
          description: { zh: '访问', en: 'visit' },
          action: { type: 'highlight', targets: [], color: 'primary' },
          stats: { comparisons: 0, swaps: 0, accesses: 0 },
        },
      ],
    }
    const scene = deriveSceneState(graphScript, 0)
    const cellIds = Object.keys(scene.entities).filter((k) => k.startsWith('arr_'))
    expect(cellIds).toHaveLength(0)
  })
})
