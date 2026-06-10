import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GeometryView from '@/scene/primitives/GeometryView'
import type { SceneCell } from '@/scene/types'

function cell(id: string, meta: Record<string, unknown>): SceneCell {
  return { id, type: 'cell', position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, value: '', meta } as SceneCell
}

const plane = cell('geo_plane', { kind: 'plane', xRange: [0, 10], yRange: [0, 10] })

describe('GeometryView', () => {
  it('无 plane cell 时返回 null', () => {
    const { container } = render(<svg><GeometryView cells={[cell('geo_A', { kind: 'point', gx: 1, gy: 1 })]} /></svg>)
    expect(container.querySelector('g.geometry-view')).toBeNull()
  })

  it('渲染坐标轴(两条 line)与一个点', () => {
    const cells = [plane, cell('geo_A', { kind: 'point', gx: 3, gy: 4, color: 'primary' })]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    // 2 axis lines
    expect(container.querySelectorAll('line').length).toBe(2)
    expect(container.querySelectorAll('circle').length).toBe(1)
  })

  it('point 带 label 渲染文本，不带 label 则无文本', () => {
    const withLabel = [plane, cell('geo_A', { kind: 'point', gx: 1, gy: 1, label: 'P', color: 'success' })]
    const { container: c1 } = render(<svg><GeometryView cells={withLabel} /></svg>)
    expect(Array.from(c1.querySelectorAll('text')).map(t => t.textContent)).toContain('P')

    const noLabel = [plane, cell('geo_B', { kind: 'point', gx: 2, gy: 2 })]
    const { container: c2 } = render(<svg><GeometryView cells={noLabel} /></svg>)
    expect(c2.querySelectorAll('text').length).toBe(0)
  })

  it('渲染 segment 为额外的 line', () => {
    const cells = [plane, cell('geo_s', { kind: 'segment', gx: 0, gy: 0, to: [5, 5], color: 'danger' })]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    // 2 axes + 1 segment
    expect(container.querySelectorAll('line').length).toBe(3)
  })

  it('渲染 polygon', () => {
    const cells = [plane, cell('geo_p', { kind: 'polygon', points: [[0, 0], [5, 0], [5, 5]], color: 'warning' })]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    const poly = container.querySelector('polygon')
    expect(poly).toBeTruthy()
    expect(poly!.getAttribute('points')!.split(' ').length).toBe(3)
  })

  it('渲染 sweepline x 轴与 y 轴', () => {
    const cellsX = [plane, cell('geo_swx', { kind: 'sweepline', axis: 'x', value: 5, color: 'muted' })]
    const { container: cx } = render(<svg><GeometryView cells={cellsX} /></svg>)
    const dashedX = Array.from(cx.querySelectorAll('line')).filter(l => l.getAttribute('stroke-dasharray') === '5 4')
    expect(dashedX.length).toBe(1)

    const cellsY = [plane, cell('geo_swy', { kind: 'sweepline', axis: 'y', value: 3 })]
    const { container: cy } = render(<svg><GeometryView cells={cellsY} /></svg>)
    const dashedY = Array.from(cy.querySelectorAll('line')).filter(l => l.getAttribute('stroke-dasharray') === '5 4')
    expect(dashedY.length).toBe(1)
  })

  it('未知 kind 的 cell 被跳过', () => {
    const cells = [plane, cell('geo_x', { kind: 'mystery' })]
    const { container } = render(<svg><GeometryView cells={cells} /></svg>)
    // only 2 axis lines, no shapes
    expect(container.querySelectorAll('line').length).toBe(2)
    expect(container.querySelectorAll('polygon').length).toBe(0)
    expect(container.querySelectorAll('circle').length).toBe(0)
  })
})
