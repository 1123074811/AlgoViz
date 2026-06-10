import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NodeView from '@/scene/primitives/NodeView'
import type { SceneNode } from '@/scene/types'

function baseNode(overrides: Partial<SceneNode> = {}): SceneNode {
  return {
    id: 'n1',
    type: 'node',
    variant: 'graph.node',
    position: { x: 100, y: 80 },
    fields: [{ id: 'f0', value: 42, role: 'data' }],
    ports: [],
    ...overrides,
  }
}

/** A <text>'s textContent includes any nested <title>; strip the title text. */
function visibleText(el: Element): string {
  const titleNode = el.querySelector('title')
  const titleText = titleNode?.textContent ?? ''
  const full = el.textContent ?? ''
  return titleText && full.startsWith(titleText) ? full.slice(titleText.length) : full
}

describe('NodeView', () => {
  it('renders a circle for graph/tree/union_find variants with value text', () => {
    const { container } = render(
      <svg><NodeView node={baseNode()} /></svg>,
    )
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll('rect').length).toBe(0)
    const text = container.querySelector('text')
    expect(text?.textContent).toBe('42')
    // title reflects id and variant
    expect(container.querySelector('title')?.textContent).toContain('n1 · graph.node')
  })

  it('renders an active ring when role is active/visited/current', () => {
    const { container } = render(
      <svg><NodeView node={baseNode({ state: { role: 'active', color: 'primary' } })} /></svg>,
    )
    const ring = container.querySelector('.node-active-ring')
    expect(ring).toBeTruthy()
    // two circles: ring + body
    expect(container.querySelectorAll('circle').length).toBe(2)
    expect(container.querySelector('title')?.textContent).toContain('· active')
  })

  it('applies pulse class and opacity', () => {
    const { container } = render(
      <svg><NodeView node={baseNode({ state: { pulse: true, opacity: 0.5 } })} /></svg>,
    )
    expect(container.querySelector('.node-pulse')).toBeTruthy()
    const g = container.querySelector('g[opacity]')
    expect(g?.getAttribute('opacity')).toBe('0.5')
  })

  it('renders extra circle fields as secondary labels', () => {
    const node = baseNode({
      fields: [
        { id: 'f0', value: 7, role: 'data' },
        { id: 'f1', label: 'rank', value: 2 },
      ],
    })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('7')
    expect(texts.some(t => t === 'rank:2')).toBe(true)
  })

  it('renders a rect for non-circle variants (e.g. list)', () => {
    const node = baseNode({
      variant: 'list.node',
      fields: [{ id: 'f0', value: 'abc', role: 'data', label: 'val' }],
    })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll('circle').length).toBe(0)
    const texts = Array.from(container.querySelectorAll('text')).map(visibleText)
    expect(texts).toContain('abc')
    // data field with label draws the label too
    expect(texts).toContain('val')
  })

  it('treats tree.btree as a rect, not a circle', () => {
    const node = baseNode({ variant: 'tree.btree', fields: [{ id: 'f0', value: 5 }] })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelectorAll('circle').length).toBe(0)
  })

  it('renders dividers between multiple rect fields and an active ring rect', () => {
    const node = baseNode({
      variant: 'list.node',
      fields: [
        { id: 'f0', value: 'x', role: 'data' },
        { id: 'f1', value: 'y', role: 'value' },
      ],
      state: { role: 'visited', color: 'success' },
    })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    // divider line drawn for the second field
    expect(container.querySelectorAll('line').length).toBe(1)
    // active ring rect present
    expect(container.querySelector('.node-active-ring')).toBeTruthy()
  })

  it('handles a node with no fields without crashing', () => {
    const node = baseNode({ variant: 'list.node', fields: [] })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to muted palette for an unknown color', () => {
    const node = baseNode({ state: { color: 'nonexistent' as never } })
    const { container } = render(<svg><NodeView node={node} /></svg>)
    expect(container.querySelector('circle')).toBeTruthy()
  })
})
