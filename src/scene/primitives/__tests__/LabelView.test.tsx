import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LabelView from '../LabelView'
import type { SceneLabel } from '../../types'

function label(text: string, x = 100, y = 50): SceneLabel {
  return { id: 'l1', type: 'label', text, position: { x, y } }
}

describe('LabelView', () => {
  it('renders short text untouched with no title tooltip', () => {
    const { container } = render(<svg><LabelView label={label('short')} /></svg>)
    const text = container.querySelector('text')
    expect(text?.textContent).toBe('short')
    expect(text?.getAttribute('x')).toBe('100')
    expect(text?.getAttribute('y')).toBe('50')
    expect(container.querySelector('title')).toBeNull()
  })

  it('truncates long text and exposes full text via title', () => {
    const full = 'x'.repeat(60)
    const { container } = render(<svg><LabelView label={label(full)} /></svg>)
    const text = container.querySelector('text')
    const title = container.querySelector('title')
    // Truncation happened → a <title> carrying the full text is rendered.
    expect(title?.textContent).toBe(full)
    // <text>.textContent includes the nested <title>; strip it to get the
    // visible label, which must be ellipsized and shorter than the original.
    const visible = (text?.textContent ?? '').replace(full, '')
    expect(visible.endsWith('…')).toBe(true)
    expect(visible.length).toBeLessThan(full.length)
  })

  it('positions the text from the label coordinates', () => {
    const { container } = render(<svg><LabelView label={label('hi', 12, 34)} /></svg>)
    const text = container.querySelector('text')
    expect(text?.getAttribute('x')).toBe('12')
    expect(text?.getAttribute('y')).toBe('34')
    expect(text?.getAttribute('text-anchor')).toBe('middle')
  })
})
