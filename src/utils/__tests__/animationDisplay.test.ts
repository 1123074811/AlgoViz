import { describe, expect, it } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import { inferOutputDisplay, summarizeInitialState } from '../animationDisplay'

const baseScript: AnimationScript = {
  algorithm: 'custom',
  complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' },
  initialState: { type: 'array', data: [3, 1, 2] },
  steps: [],
}

describe('animationDisplay', () => {
  it('优先展示脚本显式 result', () => {
    const output = inferOutputDisplay({ ...baseScript, result: [0, 2] }, { arrayData: [1, 2, 3] }, 0, 0)

    expect(output.status).toBe('ready')
    expect(output.source).toBe('script')
    expect(output.value).toBe('[0, 2]')
  })

  it('排序类缺少 result 时展示最终数组', () => {
    const output = inferOutputDisplay(
      { ...baseScript, algorithm: 'bubble_sort', presentation: { engine: 'scene', module: 'array' } },
      { arrayData: [1, 2, 3] },
      2,
      2,
    )

    expect(output.status).toBe('ready')
    expect(output.source).toBe('array')
    expect(output.value).toBe('[1, 2, 3]')
  })

  it('AI 脚本缺少 result 时从 math.set(ans) 推断输出', () => {
    const output = inferOutputDisplay(
      {
        ...baseScript,
        algorithm: 'max_area',
        steps: [
          {
            stepId: 0,
            codeLine: 0,
            description: { zh: '', en: '' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
            events: [{ type: 'math.init', vars: [{ name: 'ans', value: 0 }] }],
          },
          {
            stepId: 1,
            codeLine: 1,
            description: { zh: '', en: '' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
            events: [{ type: 'math.set', name: 'ans', value: 12 }],
          },
        ],
      },
      { arrayData: [2, 6, 3] },
      2,
      2,
    )

    expect(output.status).toBe('ready')
    expect(output.source).toBe('event')
    expect(output.label).toBe('ans')
    expect(output.value).toBe('12')
  })

  it('运行中时输出区域保持存在并显示进度', () => {
    const output = inferOutputDisplay({ ...baseScript, result: 3 }, { arrayData: [3, 1, 2] }, 1, 3)

    expect(output.status).toBe('running')
    expect(output.value).toBe('运行中 1/3')
  })

  it('图和树初始状态包含结构摘要', () => {
    const graphItems = summarizeInitialState({
      ...baseScript,
      initialState: {
        type: 'graph',
        data: [],
        nodes: [{ id: 'A' }, { id: 'B' }],
        edges: [{ source: 'A', target: 'B', weight: 1 }],
      },
    })
    const treeItems = summarizeInitialState({
      ...baseScript,
      initialState: {
        type: 'tree',
        data: [],
        root: 'r',
        children: { r: ['l'], l: [] },
      },
    })

    expect(graphItems).toEqual(expect.arrayContaining([
      { label: '节点', value: '2 个' },
      { label: '边', value: '1 条' },
    ]))
    expect(treeItems).toEqual(expect.arrayContaining([
      { label: '根节点', value: 'r' },
      { label: '树节点', value: '2 个' },
    ]))
  })
})
