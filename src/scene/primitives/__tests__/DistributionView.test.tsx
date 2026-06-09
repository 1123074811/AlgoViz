import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DistributionView from '../DistributionView'
import type { SceneCell } from '../../types'

function bin(i: number, weight: number): SceneCell {
  return { id: `prob_bin_${i}`, type: 'cell', position: { x: 100 + i * 56, y: 360 }, size: { width: 40, height: 1 }, value: String.fromCharCode(97 + i), col: i, state: { role: 'idle', color: 'primary' }, meta: { kind: 'bin', label: String.fromCharCode(97 + i), weight } } as SceneCell
}

describe('DistributionView', () => {
  it('按权重绘制柱(权重大的柱更高)', () => {
    const cells = [bin(0, 1), bin(1, 4)]
    const { container } = render(<svg><DistributionView cells={cells} /></svg>)
    const rects = Array.from(container.querySelectorAll('rect'))
    expect(rects.length).toBeGreaterThanOrEqual(2)
    const h0 = Number(rects[0].getAttribute('height'))
    const h1 = Number(rects[1].getAttribute('height'))
    expect(h1).toBeGreaterThan(h0)
  })
})
