import { describe, expect, it } from 'vitest'
import { AnimationBuilder } from '../builder'

describe('AnimationBuilder DP invariants', () => {
  it('expands a valid dpDecide into existing DP events', () => {
    const builder = new AnimationBuilder('dp', 'array')
    builder.dpCreate('dp', 2, 2)
    builder.dpSet('dp', 0, 0, 2)
    builder.dpSet('dp', 0, 1, 3)
    builder.dpDecide({
      tableId: 'dp',
      target: { row: 1, col: 0 },
      candidates: [
        { sources: [{ row: 0, col: 0 }], value: 2, label: '上方' },
        { sources: [{ row: 0, col: 1 }], value: 3, label: '右上' },
      ],
      operator: 'min',
      chosen: 0,
      value: 2,
    })

    expect(builder.build().steps.slice(-4).flatMap(step => (step.events ?? []).map(event => event.type))).toEqual([
      'dp.highlight',
      'dp.dependency',
      'dp.formula',
      'dp.set',
    ])
  })

  it('rejects out-of-bounds, use-before-set, bad arithmetic, and a wrong choice', () => {
    const builder = new AnimationBuilder('dp', 'array')
    builder.dpCreate('dp', 2, 2)
    expect(() => builder.dpSet('dp', 2, 0, 1)).toThrow('超出')
    expect(() => builder.dpDependency('dp', [{ row: 0, col: 0 }], { row: 1, col: 0 })).toThrow('尚未赋值')
    builder.dpSet('dp', 0, 0, 2)
    builder.dpSet('dp', 0, 1, 3)
    expect(() => builder.dpDecide({
      tableId: 'dp',
      target: { row: 1, col: 0 },
      candidates: [{ sources: [{ row: 0, col: 0 }], value: 9 }],
      operator: 'min',
      chosen: 0,
      value: 9,
    })).toThrow('候选 0')
    expect(() => builder.dpDecide({
      tableId: 'dp',
      target: { row: 1, col: 0 },
      candidates: [
        { sources: [{ row: 0, col: 0 }], value: 2 },
        { sources: [{ row: 0, col: 1 }], value: 3 },
      ],
      operator: 'min',
      chosen: 1,
      value: 2,
    })).toThrow('chosen')
  })
})

describe('AnimationBuilder backtracking invariants', () => {
  it('accepts an undo only after state restoration', () => {
    const state: number[] = []
    const builder = new AnimationBuilder('search', 'tree')
    builder.searchRoot('root')
    builder.backtrackTry({ choice: 1, state })
    state.push(1)
    state.pop()
    builder.backtrackUndo({ choice: 1, state })
    expect(() => builder.build()).not.toThrow()
  })

  it('rejects missing undo, wrong restoration, unknown parents, and unbalanced recursion', () => {
    const missingUndo = new AnimationBuilder('search', 'tree')
    missingUndo.searchRoot('root')
    missingUndo.backtrackTry({ choice: 1, state: [] })
    expect(() => missingUndo.build()).toThrow('未闭合')
    expect(() => missingUndo.backtrackUndo({ choice: 1, state: [1] })).toThrow('状态未恢复')

    const badParent = new AnimationBuilder('search', 'tree')
    badParent.searchRoot('root')
    expect(() => badParent.searchTry('missing', 'child')).toThrow('不存在')
    expect(() => badParent.searchLeave()).toThrow('不平衡')

    const unbalanced = new AnimationBuilder('search', 'tree')
    unbalanced.searchRoot('root')
    unbalanced.searchEnter('child')
    expect(() => unbalanced.build()).toThrow('搜索栈未平衡')
  })
})

describe('AnimationBuilder event budget', () => {
  function run(maxSteps: number) {
    const builder = new AnimationBuilder('sum', 'array', { maxSteps })
    builder.arrayCreate(Array.from({ length: 100 }, (_, index) => index + 1))
    let result = 0
    for (let index = 1; index <= 100; index++) {
      result += index
      builder.varSet('sum', result)
    }
    builder.result(result)
    return builder.build()
  }

  it('changes recorded steps without changing the computed result', () => {
    const compact = run(5)
    const detailed = run(200)
    expect(compact.steps).toHaveLength(5)
    expect(compact.steps[compact.steps.length - 1]?.description.zh).toContain('已省略 98 个')
    expect(compact.result).toBe(5050)
    expect(detailed.result).toBe(compact.result)
    expect(detailed.steps.length).toBeGreaterThan(compact.steps.length)
  })
})
