import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HeapView from '../HeapView'
import type { SceneCell } from '../../types'

function heapNode(index: number, value: number, x: number, y: number): SceneCell {
  return {
    id: `heap_${index}`,
    type: 'cell',
    position: { x, y },
    size: { width: 44, height: 44 },
    value,
    col: index,
    meta: { index, variant: 'min' },
  }
}

describe('HeapView', () => {
  it('把底层数组镜像放在堆树上方，避免底部虚线遮挡', () => {
    const nodes = [
      heapNode(0, 100, 200, 200),
      heapNode(1, 1000, 168, 296),
      heapNode(2, 200, 232, 296),
    ]

    const { container } = render(
      <svg>
        <HeapView nodes={nodes} hideTitle />
      </svg>,
    )

    const mirrorLabel = Array.from(container.querySelectorAll('text'))
      .find((node) => node.textContent === '底层数组（层序）')
    const mirrorRect = Array.from(container.querySelectorAll('rect'))
      .find((node) => node.getAttribute('stroke-dasharray') === '5 3')

    expect(mirrorLabel).toBeTruthy()
    expect(mirrorRect).toBeTruthy()

    const topNodeY = Math.min(...nodes.map(node => node.position.y - (node.size?.height ?? 44) / 2))
    expect(Number(mirrorLabel!.getAttribute('y'))).toBeLessThan(topNodeY)
    expect(Number(mirrorRect!.getAttribute('y'))).toBeLessThan(topNodeY)
  })
})
