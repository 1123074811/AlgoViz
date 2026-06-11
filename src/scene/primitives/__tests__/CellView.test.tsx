import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CellView from '@/scene/primitives/CellView'
import type { SceneCell } from '@/scene/types'

function cell(overrides: Partial<SceneCell> = {}): SceneCell {
  return {
    id: 'arr_0',
    type: 'cell',
    position: { x: 50, y: 50 },
    size: { width: 44, height: 44 },
    value: 7,
    col: 0,
    ...overrides,
  }
}

function visibleText(el: Element): string {
  const titleText = el.querySelector('title')?.textContent ?? ''
  const full = el.textContent ?? ''
  return titleText && full.startsWith(titleText) ? full.slice(titleText.length) : full
}

describe('CellView', () => {
  it('renders a rect and value text', () => {
    const { container } = render(<svg><CellView cell={cell()} /></svg>)
    expect(container.querySelector('rect')).toBeTruthy()
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    expect(texts).toContain('7')
  })

  it('does NOT draw the array index label itself (axis layer owns it so it stays pinned during swaps)', () => {
    const { container } = render(<svg><CellView cell={cell({ id: 'arr_0', col: 0, value: 7 })} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    expect(texts).toContain('7')      // value still drawn by the cell
    expect(texts).not.toContain('0')  // index label delegated to renderArrayIndexAxis
  })

  it('renders row,col index label when row is present', () => {
    const { container } = render(
      <svg><CellView cell={cell({ id: 'm_0_0', row: 1, col: 2 })} /></svg>,
    )
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    expect(texts).toContain('1,2')
    expect(container.querySelector('title')?.textContent).toContain('(1,2)')
  })

  it('returns null for empty_placeholder role', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { role: 'empty_placeholder' } })} /></svg>,
    )
    expect(container.querySelector('rect')).toBeNull()
  })

  it('returns null for skipped id prefixes', () => {
    for (const id of ['mathvar_x', 'geo_1', 'auto_2', 'prob_3']) {
      const { container } = render(<svg><CellView cell={cell({ id })} /></svg>)
      expect(container.querySelector('rect')).toBeNull()
    }
  })

  it('renders header role as plain text only', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { role: 'header' }, value: 'i' })} /></svg>,
    )
    expect(container.querySelector('rect')).toBeNull()
    expect(container.querySelector('text')?.textContent).toContain('i')
    expect(container.querySelector('title')?.textContent).toContain('· header')
  })

  it('draws a current ring for current/active role', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { role: 'current' } })} /></svg>,
    )
    expect(container.querySelector('.cell-current-ring')).toBeTruthy()
    // ring rect + body rect
    expect(container.querySelectorAll('rect').length).toBe(2)
  })

  it('uses window palette for window role', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { role: 'window' } })} /></svg>,
    )
    const body = Array.from(container.querySelectorAll('rect')).find(r => r.getAttribute('fill') === '#F8FBFF')
    expect(body).toBeTruthy()
  })

  it('uses danger text color for conflict role', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { role: 'conflict' } })} /></svg>,
    )
    const valueText = Array.from(container.querySelectorAll('text')).find(t => visibleText(t) === '7')
    expect(valueText?.getAttribute('fill')).toBe('#EF4444')
  })

  it('maps legacy color names to semantic palette', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { color: 'success' } })} /></svg>,
    )
    const body = Array.from(container.querySelectorAll('rect')).find(r => r.getAttribute('fill') === '#ECFDF5')
    expect(body).toBeTruthy()
  })

  it('hides col label for dedicated-structure prefixes', () => {
    const { container } = render(
      <svg><CellView cell={cell({ id: 'stack_0', col: 0 })} /></svg>,
    )
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    // value present but no standalone "0" index label
    expect(texts).toContain('7')
    expect(texts.filter(t => t === '0').length).toBe(0)
  })

  it('hides col label for string char cells', () => {
    const { container } = render(
      <svg><CellView cell={cell({ id: 's_0_3', value: 'a', col: 3 })} /></svg>,
    )
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    expect(texts.filter(t => t === '3').length).toBe(0)
  })

  it('truncates long values and nests original in a title', () => {
    const { container } = render(
      <svg><CellView cell={cell({ value: 'a-very-long-value-that-overflows', size: { width: 30, height: 30 } })} /></svg>,
    )
    const valueText = Array.from(container.querySelectorAll('text')).find(t => t.querySelector('title'))
    expect(valueText).toBeTruthy()
    expect(valueText?.querySelector('title')?.textContent).toBe('a-very-long-value-that-overflows')
  })

  it('applies pulse class and opacity', () => {
    const { container } = render(
      <svg><CellView cell={cell({ state: { pulse: true, opacity: 0.4 } })} /></svg>,
    )
    expect(container.querySelector('.cell-pulse')).toBeTruthy()
    expect(container.querySelector('g[opacity]')?.getAttribute('opacity')).toBe('0.4')
  })
})
