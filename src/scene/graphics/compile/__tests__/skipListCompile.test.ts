import { describe, it, expect } from 'vitest'
import { skipListCompiler } from '../skipListCompile'
import type { CompileContext } from '../../../SceneEngine'

const ctx = (): CompileContext => ({ scene: { entities: {}, edges: {} } } as unknown as CompileContext)

describe('skipListCompiler', () => {
  it('supports skip_list.* events', () => {
    expect(skipListCompiler.supports({ type: 'skip_list.create', values: [1], heights: [1] } as never)).toBe(true)
    expect(skipListCompiler.supports({ type: 'array.create', values: [] } as never)).toBe(false)
  })
  it('create emits one cell per (node, level) occurrence', () => {
    // values [1,2,3], heights [1,2,1] -> 1 + 2 + 1 = 4 node cells + head cells
    const cmds = skipListCompiler.compile({ type: 'skip_list.create', values: [1, 2, 3], heights: [1, 2, 1] } as never, ctx())
    const cells = cmds.filter(c => c.type === 'create_cell')
    expect(cells.length).toBeGreaterThanOrEqual(4)
    const arrows = cmds.filter(c => c.type === 'connect')
    expect(arrows.length).toBeGreaterThan(0)
  })
  it('highlights one semantic search movement per event', () => {
    const cmds = skipListCompiler.compile({ type: 'skip_list.move_right', from: -1, to: 1, level: 1 } as never, ctx())
    expect(cmds.some(c => c.type === 'set_state')).toBe(true)
  })
})
