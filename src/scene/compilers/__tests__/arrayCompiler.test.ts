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
