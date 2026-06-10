import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContainerView from '@/scene/primitives/ContainerView'
import type { SceneCell, SceneNode } from '@/scene/types'

function cell(id: string, x: number, y: number): SceneCell {
  return {
    id,
    type: 'cell',
    position: { x, y },
    size: { width: 44, height: 44 },
    value: id,
  }
}

function node(id: string, x: number, y: number): SceneNode {
  return {
    id,
    type: 'node',
    variant: 'map.entry',
    position: { x, y },
    size: { width: 120, height: 48 },
    fields: [{ id: 'f0', value: id }],
    ports: [],
  }
}

describe('ContainerView', () => {
  it('renders a dashed map panel with 映射 label around nodes', () => {
    const nodes = [node('m0', 100, 100), node('m1', 100, 160)]
    const { container } = render(
      <svg><ContainerView type="map" cells={[]} nodes={nodes} /></svg>,
    )
    const rect = container.querySelector('rect')
    expect(rect?.getAttribute('stroke-dasharray')).toBe('4 2')
    expect(container.querySelector('text')?.textContent).toBe('映射')
  })

  it('returns null for map with no nodes', () => {
    const { container } = render(<svg><ContainerView type="map" cells={[]} /></svg>)
    expect(container.querySelector('rect')).toBeNull()
  })

  it('returns null for non-map type with no cells', () => {
    const { container } = render(<svg><ContainerView type="stack" cells={[]} /></svg>)
    expect(container.querySelector('path')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
  })

  it('renders a U-shaped stack with default 栈 label and 栈顶 marker', () => {
    const cells = [cell('stack_0', 100, 60), cell('stack_1', 100, 110)]
    const { container } = render(<svg><ContainerView type="stack" cells={cells} /></svg>)
    expect(container.querySelector('path')?.getAttribute('d')).toContain('M ')
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('栈')
    expect(texts.some(t => t?.includes('栈顶'))).toBe(true)
  })

  it('uses an explicit stack label when provided', () => {
    const cells = [cell('stack_0', 100, 60)]
    const { container } = render(
      <svg><ContainerView type="stack" cells={cells} label="调用栈" /></svg>,
    )
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('调用栈')
  })

  it('falls back to a cell meta label for the stack', () => {
    const c = cell('stack_0', 100, 60)
    c.meta = { label: 'MyStack' }
    const { container } = render(<svg><ContainerView type="stack" cells={[c]} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('MyStack')
  })

  it('renders two parallel queue lines with 队首/队尾 labels', () => {
    const cells = [cell('queue_0', 50, 100), cell('queue_1', 100, 100)]
    const { container } = render(<svg><ContainerView type="queue" cells={cells} /></svg>)
    expect(container.querySelectorAll('line').length).toBe(2)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).toContain('队首')
    expect(texts).toContain('队尾')
  })

  it('renders one auxiliary panel rect per row', () => {
    const cells = [
      cell('aux_0', 50, 100),
      cell('aux_1', 100, 100),
      cell('aux_2', 50, 200),
    ]
    const { container } = render(<svg><ContainerView type="auxiliary" cells={cells} /></svg>)
    const rects = Array.from(container.querySelectorAll('rect'))
    expect(rects.length).toBe(2)
    expect(rects[0].getAttribute('stroke-dasharray')).toBeNull()
  })
})
