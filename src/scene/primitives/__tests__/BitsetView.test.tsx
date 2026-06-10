import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BitsetView from '@/scene/primitives/BitsetView'
import type { SceneCell } from '@/scene/types'

function bit(id: string, x: number, col?: number, index?: number): SceneCell {
  return {
    id,
    type: 'cell',
    position: { x, y: 100 },
    size: { width: 44, height: 44 },
    value: 0,
    col,
    meta: index !== undefined ? { index } : undefined,
  }
}

describe('BitsetView', () => {
  it('returns null for an empty bit array', () => {
    const { container } = render(<svg><BitsetView bits={[]} /></svg>)
    expect(container.querySelector('rect')).toBeNull()
  })

  it('renders a dashed frame, default title, and per-bit index labels', () => {
    const bits = [bit('bit_0', 0, 0), bit('bit_1', 50, 1), bit('bit_2', 100, 2)]
    const { container } = render(<svg><BitsetView bits={bits} /></svg>)
    const frame = container.querySelector('rect')
    expect(frame?.getAttribute('stroke-dasharray')).toBe('5 3')
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('位集')
    expect(texts).toContain('0')
    expect(texts).toContain('2')
  })

  it('uses labelCell value as the title', () => {
    const bits = [bit('bit_0', 0, 0)]
    const labelCell = bit('bit_label', 0, 0)
    labelCell.value = 'Bitmask'
    const { container } = render(<svg><BitsetView bits={bits} labelCell={labelCell} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('Bitmask')
  })

  it('hides the title when hideTitle is set', () => {
    const bits = [bit('bit_0', 0, 0)]
    const { container } = render(<svg><BitsetView bits={bits} hideTitle /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).not.toContain('位集')
    // index label still rendered
    expect(texts).toContain('0')
  })

  it('sorts bits by index, including meta.index and id-derived index', () => {
    // Provide out-of-order; one with meta.index, one id-derived, one fallback id.
    const bits = [
      bit('bit_2', 100, undefined, 2),
      bit('bit_0', 0, undefined, undefined),
      bit('bad', 50, undefined, undefined),
    ]
    const { container } = render(<svg><BitsetView bits={bits} hideTitle /></svg>)
    const labels = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    // col undefined → falls back to indexOf; values should appear
    expect(labels).toContain('2')
    expect(labels).toContain('0')
  })

  it('prefers col over computed index for label text', () => {
    const bits = [bit('bit_0', 0, 5)]
    const { container } = render(<svg><BitsetView bits={bits} hideTitle /></svg>)
    const labels = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(labels).toContain('5')
  })
})
