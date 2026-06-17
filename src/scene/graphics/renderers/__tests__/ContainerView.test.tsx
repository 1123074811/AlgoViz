import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContainerView from '@/scene/graphics/renderers/ContainerView'
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

  it('renders a row of queue cells with index numbers and ▼front/▼rear pointers', () => {
    const c0 = cell('queue_0', 50, 100); c0.col = 0; c0.meta = { queueFront: 0, queueRear: 1 }
    const c1 = cell('queue_1', 102, 100); c1.col = 1
    const c2 = cell('queue_2', 154, 100); c2.col = 2; c2.state = { role: 'empty_placeholder' }
    const { container } = render(<svg><ContainerView type="queue" cells={[c0, c1, c2]} /></svg>)
    // demo 形态:不再有大盒子的两条平行线
    expect(container.querySelectorAll('line').length).toBe(0)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    // 每格下方索引数字
    expect(texts).toContain('0')
    expect(texts).toContain('1')
    expect(texts).toContain('2')
    // front/rear 指针
    expect(texts).toContain('▼front')
    expect(texts).toContain('▼rear')
    // 空槽补画虚线方块
    const dashed = Array.from(container.querySelectorAll('rect'))
      .filter(r => r.getAttribute('stroke-dasharray') === '3 3')
    expect(dashed.length).toBe(1)
  })

  it('omits front/rear pointers for an empty queue', () => {
    const c0 = cell('queue_0', 50, 100); c0.col = 0
    c0.state = { role: 'empty_placeholder' }; c0.meta = { queueFront: -1, queueRear: -1 }
    const { container } = render(<svg><ContainerView type="queue" cells={[c0]} /></svg>)
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent)
    expect(texts).not.toContain('▼front')
    expect(texts).not.toContain('▼rear')
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
