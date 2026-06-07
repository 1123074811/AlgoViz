import { describe, expect, it } from 'vitest'
import { deriveSceneState } from '@/scene'
import type { AnimationScript } from '@/types/animation'

const script: AnimationScript = {
  algorithm: 'symmetric_tree',
  presentation: { engine: 'scene', module: 'tree' },
  complexity: {
    time: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    space: 'O(n)',
  },
  initialState: {
    type: 'tree',
    data: [],
    root: '0',
    children: { '0': ['1', '2'], '1': [], '2': [] },
    treeNodes: [
      { id: '0', value: 1 },
      { id: '1', value: 2 },
      { id: '2', value: 2 },
    ],
  },
  result: true,
  steps: [
    {
      stepId: 1,
      codeLine: 6,
      description: { zh: '初始化队列', en: 'init queue' },
      action: { type: 'highlight', targets: [], color: 'primary' },
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
      events: [
        {
          type: 'tree.create',
          variant: 'binary',
          rootId: '0',
          nodes: [
            { id: '0', value: 1 },
            { id: '1', value: 2 },
            { id: '2', value: 2 },
          ],
          edges: [
            { parentId: '0', childId: '1' },
            { parentId: '0', childId: '2' },
          ],
        },
      ],
      teachingState: { queue: ['0', '0'] },
    },
  ],
}

describe('tree auxiliary queue rendering', () => {
  it('renders queue cells for tree algorithms with teachingState.queue', () => {
    const scene = deriveSceneState(script, 1)
    const queueCells = Object.values(scene.entities).filter(entity => /^queue_\d+$/.test(entity.id))

    expect(queueCells).toHaveLength(2)
    expect(queueCells.map(cell => cell.type === 'cell' ? cell.value : null)).toEqual([1, 1])
  })
})
