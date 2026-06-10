import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RegionView from '../RegionView'
import type { SceneGroup } from '../../types'

describe('RegionView', () => {
  it('renders a bordered rect and label when bounds + label present', () => {
    const region: SceneGroup = {
      id: 'g1',
      type: 'group',
      label: '区域A',
      entityIds: ['a', 'b'],
      bounds: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
    }
    const { container } = render(<svg><RegionView region={region} /></svg>)

    const rect = container.querySelector('rect')
    expect(rect).toBeTruthy()
    expect(rect?.getAttribute('x')).toBe('10')
    expect(rect?.getAttribute('y')).toBe('20')
    expect(rect?.getAttribute('width')).toBe('100')
    expect(rect?.getAttribute('height')).toBe('80')
    expect(rect?.getAttribute('stroke-dasharray')).toBe('6 4')

    const text = container.querySelector('text')
    expect(text?.textContent).toBe('区域A')
  })

  it('renders rect but no label when label absent', () => {
    const region: SceneGroup = {
      id: 'g2',
      type: 'group',
      entityIds: [],
      bounds: { position: { x: 0, y: 0 }, size: { width: 50, height: 50 } },
    }
    const { container } = render(<svg><RegionView region={region} /></svg>)
    expect(container.querySelector('rect')).toBeTruthy()
    expect(container.querySelector('text')).toBeNull()
  })

  it('renders nothing when bounds are missing', () => {
    const region: SceneGroup = {
      id: 'g3',
      type: 'group',
      label: 'no bounds',
      entityIds: [],
    }
    const { container } = render(<svg><RegionView region={region} /></svg>)
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('text')).toBeNull()
  })
})
