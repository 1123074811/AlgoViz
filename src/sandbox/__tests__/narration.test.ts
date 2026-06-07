import { describe, it, expect } from 'vitest'
import { AnimationBuilder } from '../builder'

/**
 * WS4 叙事兜底：当 AI 省略 b.desc() 时，builder 必须从事件本身推导出
 * 非空且贴切的中文描述，杜绝 callstack.* / grid.* / dp.* 事件落到无意义的
 * “步骤 N” 占位。
 */
describe('AnimationBuilder — 叙事兜底 defaultDescFor', () => {
  const placeholder = /^步骤\s*\d+$/

  it('callstack.push 在无 desc 时产出含函数名的描述', () => {
    const b = new AnimationBuilder('dfs', 'array')
    b.callStackCreate()
    b.callPush('dfs', { node: 1 })
    const script = b.build()
    const pushStep = script.steps[1]
    const zh = pushStep.description.zh
    expect(zh).not.toBe('')
    expect(zh).not.toMatch(placeholder)
    expect(zh).toContain('dfs')
    expect(zh).toContain('调用')
  })

  it('callstack 各操作均有非占位描述', () => {
    const b = new AnimationBuilder('dfs', 'array')
    b.callStackCreate()
    b.callPush('f', {}, {}, 'f0')
    b.callUpdate('f0', { status: 'active' })
    b.callReturn('f0', 42)
    b.callPop('f0')
    const script = b.build()
    for (const step of script.steps) {
      expect(step.description.zh).not.toBe('')
      expect(step.description.zh).not.toMatch(placeholder)
    }
    expect(script.steps[2].description.zh).toContain('f0')
    expect(script.steps[3].description.zh).toContain('42')
  })

  it('grid.visit / grid.set_cell 在无 desc 时产出含坐标的描述', () => {
    const b = new AnimationBuilder('num_islands', 'array')
    b.gridCreate([[1, 0], [0, 1]])
    b.gridVisit(0, 0)
    b.gridSet(1, 1, 2)
    const script = b.build()
    const visitZh = script.steps[1].description.zh
    const setZh = script.steps[2].description.zh
    expect(visitZh).not.toBe('')
    expect(visitZh).not.toMatch(placeholder)
    expect(visitZh).toContain('(0,0)')
    expect(setZh).toContain('(1,1)')
    expect(setZh).toContain('2') // 含写入值
  })

  it('dp.set 在无 desc 时产出含坐标与值的描述', () => {
    const b = new AnimationBuilder('lcs', 'array')
    b.dpCreate('dp', 2, 2)
    b.dpSet('dp', 1, 1, 3)
    const script = b.build()
    const setZh = script.steps[1].description.zh
    expect(setZh).not.toBe('')
    expect(setZh).not.toMatch(placeholder)
    expect(setZh).toContain('(1,1)')
    expect(setZh).toContain('3')
  })

  it('grid / dp 各 overlay 操作均有非占位描述', () => {
    const b = new AnimationBuilder('dijkstra', 'array')
    b.gridCreate([[1, 1], [1, 1]])
    b.gridFrontier([[0, 1]])
    b.gridPath([[0, 0], [0, 1]])
    b.gridWall(1, 1, true)
    b.gridWeight(0, 1, 5)
    b.dpCreate('dp', 2, 2)
    b.dpHighlight('dp', [{ row: 0, col: 0 }])
    b.dpTraceback('dp', [{ row: 0, col: 0 }])
    const script = b.build()
    for (const step of script.steps) {
      expect(step.description.zh).not.toBe('')
      expect(step.description.zh).not.toMatch(placeholder)
    }
  })

  it('显式 desc 优先于兜底描述', () => {
    const b = new AnimationBuilder('dfs', 'array')
    b.callStackCreate()
    b.desc('进入递归').callPush('dfs')
    const script = b.build()
    expect(script.steps[1].description.zh).toBe('进入递归')
  })
})
