import { describe, it, expect } from 'vitest'
import { hasGenerator, generatePreset } from '@/presets'
import { DEFAULT_ALGORITHMS } from '@/data/algorithmCatalog'

describe('red_black_tree wiring', () => {
  it('is registered as a generator', () => {
    expect(hasGenerator('red_black_tree')).toBe(true)
  })
  it('appears in the catalog as a data-structure', () => {
    const e = DEFAULT_ALGORITHMS.find(a => a.id === 'red_black_tree')
    expect(e).toBeDefined()
    expect(e!.hasPreset).toBe(true)
  })
  it('produces a tree.create script', () => {
    const s = generatePreset('red_black_tree', '')
    expect(s).toBeDefined()
    const hasCreate = s!.steps.some(st => st.events?.some(e => e.type === 'tree.create'))
    expect(hasCreate).toBe(true)
  })

  it('uses the submitted values and keeps every snapshot a valid red-black tree', () => {
    const script = generatePreset('red_black_tree', [9, 2, 14, 1, 6, 11, 18, 4])!
    expect(script.result).toEqual([1, 2, 4, 6, 9, 11, 14, 18])

    for (const event of script.steps.flatMap(step => step.events ?? [])) {
      if (event.type !== 'tree.create') continue
      const byId = new Map(event.nodes.map(node => [node.id, node]))
      const children = new Map<string, { left?: string; right?: string }>()
      for (const edge of event.edges) {
        const next = children.get(edge.parentId) ?? {}
        if (edge.port === 'left') next.left = edge.childId
        if (edge.port === 'right') next.right = edge.childId
        children.set(edge.parentId, next)
      }
      expect(byId.get(event.rootId)?.rbColor).toBe('black')

      const verify = (id: string | undefined, min = -Infinity, max = Infinity): number => {
        if (!id) return 1
        const node = byId.get(id)!
        expect(Number(node.value)).toBeGreaterThan(min)
        expect(Number(node.value)).toBeLessThan(max)
        const child = children.get(id)
        if (node.rbColor === 'red') {
          expect(child?.left ? byId.get(child.left)?.rbColor : 'black').toBe('black')
          expect(child?.right ? byId.get(child.right)?.rbColor : 'black').toBe('black')
        }
        const leftHeight = verify(child?.left, min, Number(node.value))
        const rightHeight = verify(child?.right, Number(node.value), max)
        expect(leftHeight).toBe(rightHeight)
        return leftHeight + (node.rbColor === 'black' ? 1 : 0)
      }
      verify(event.rootId)
    }
  })
})
