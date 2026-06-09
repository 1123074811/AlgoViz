import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GeometryView from '../GeometryView'
import type { SceneCell } from '../../types'

function cell(id: string, meta: Record<string, unknown>): SceneCell {
  return { id, type: 'cell', position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, value: '', meta } as SceneCell
}

describe('GeometryView', () => {
  it('渲染平面与一个点', () => {
    const cells = [
      cell('geo_plane', { kind: 'plane', xRange: [0, 10], yRange: [0, 10] }),
      cell('geo_A', { kind: 'point', gx: 3, gy: 4, color: 'primary' }),
    ]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(0)
  })
})
