import { describe, expect, it } from 'vitest'
import { arrayCompiler } from '../arrayCompiler'
import { truncateToWidth } from '../../textMetrics'
import type { CompileContext } from '../../SceneEngine'
import type { SceneCell } from '../../types'

// array.create does not read the context, so a minimal stub suffices.
const ctx = {} as CompileContext

function createCells(values: (string | number)[]): SceneCell[] {
  const cmds = arrayCompiler.compile({ type: 'array.create', values }, ctx)
  return cmds.map(c => {
    if (c.type !== 'create_cell') throw new Error('expected create_cell')
    return c.cell as SceneCell
  })
}

describe('arrayCompiler · array.create auto-width', () => {
  it('sizes each cell so wide values (interval pairs) are never truncated', () => {
    const cells = createCells(['[1,3]', '[2,6]', '[8,10]', '[15,18]'])
    for (const cell of cells) {
      const w = cell.size?.width ?? 44
      const shown = truncateToWidth(String(cell.value), w - 6, 14)
      expect(shown, `cell ${cell.id} value should fit without ellipsis`).toBe(String(cell.value))
    }
  })

  it('keeps plain single-digit cells at the compact 44px square', () => {
    const cells = createCells([5, 3, 8, 1])
    for (const cell of cells) expect(cell.size?.width).toBe(44)
  })

  it('lays cells out left-to-right with no horizontal overlap', () => {
    const cells = createCells(['[1,3]', '[2,6]', '[100,200]', '[8,10]'])
    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1]
      const cur = cells[i]
      const prevRight = prev.position.x + (prev.size?.width ?? 44) / 2
      const curLeft = cur.position.x - (cur.size?.width ?? 44) / 2
      expect(curLeft, `${prev.id} and ${cur.id} overlap`).toBeGreaterThanOrEqual(prevRight)
    }
  })
})

/** 构造一个带若干 cell 实体与残留 move 箭头的最小上下文。 */
function ctxWith(edgeIds: string[]): CompileContext {
  const entities: Record<string, unknown> = {
    arr_0: { type: 'cell', value: 1 },
    arr_1: { type: 'cell', value: 2 },
    arr_2: { type: 'cell', value: 3 },
  }
  const edges: Record<string, unknown> = {}
  for (const id of edgeIds) edges[id] = { id }
  return { scene: { entities, edges } } as unknown as CompileContext
}

describe('arrayCompiler · 移动箭头保持瞬时(不累积)', () => {
  it('compare 事件清除上一步残留的 move_ 箭头', () => {
    const cmds = arrayCompiler.compile({ type: 'array.compare', indices: [0, 1] }, ctxWith(['move_0_1', 'move_1_2']))
    const disconnected = cmds.filter(c => c.type === 'disconnect').map(c => (c as { edgeId: string }).edgeId)
    expect(disconnected).toContain('move_0_1')
    expect(disconnected).toContain('move_1_2')
  })

  it('move 事件先清除旧箭头,再连上本步的新箭头', () => {
    const cmds = arrayCompiler.compile({ type: 'array.move', from: 1, to: 2 }, ctxWith(['move_0_1']))
    const disconnected = cmds.filter(c => c.type === 'disconnect').map(c => (c as { edgeId: string }).edgeId)
    const connected = cmds.filter(c => c.type === 'connect').map(c => (c as { edge: { id: string } }).edge.id)
    expect(disconnected).toContain('move_0_1') // 旧箭头被清掉
    expect(connected).toContain('move_1_2')    // 本步新箭头连上
  })

  it('mark_sorted 事件也清除残留 move_ 箭头,确保最终态干净', () => {
    const cmds = arrayCompiler.compile({ type: 'array.mark_sorted', indices: [0] }, ctxWith(['move_0_1']))
    const disconnected = cmds.filter(c => c.type === 'disconnect').map(c => (c as { edgeId: string }).edgeId)
    expect(disconnected).toContain('move_0_1')
  })
})
