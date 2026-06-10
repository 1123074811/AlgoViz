import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EdgeView from '@/scene/primitives/EdgeView'
import { createEmptyScene } from '@/scene/types'
import type { SceneEdge, SceneNode, SceneState } from '@/scene/types'

function node(id: string, x: number, y: number, variant = 'graph.node'): SceneNode {
  return {
    id,
    type: 'node',
    variant,
    position: { x, y },
    size: { width: 48, height: 48 },
    fields: [{ id: 'f0', value: id }],
    ports: [],
  }
}

function sceneWith(nodes: SceneNode[]): SceneState {
  const scene = createEmptyScene()
  for (const n of nodes) scene.entities[n.id] = n
  return scene
}

function edge(overrides: Partial<SceneEdge> = {}): SceneEdge {
  return {
    id: 'e1',
    type: 'edge',
    from: { entityId: 'a' },
    to: { entityId: 'b' },
    ...overrides,
  }
}

describe('EdgeView', () => {
  it('renders a straight path between two resolved anchors', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 0)])
    const { container } = render(<svg><EdgeView edge={edge()} scene={scene} /></svg>)
    const path = container.querySelector('path')
    expect(path).toBeTruthy()
    expect(path?.getAttribute('d')).toContain('M ')
    expect(path?.getAttribute('d')).toContain('L ')
    expect(container.querySelector('title')?.textContent).toContain('e1: a → b')
  })

  it('returns null when an anchor entity is missing', () => {
    const scene = sceneWith([node('a', 0, 0)])
    const { container } = render(<svg><EdgeView edge={edge()} scene={scene} /></svg>)
    expect(container.querySelector('path')).toBeNull()
  })

  it('renders a directed arrow marker and a label', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 0)])
    const { container } = render(
      <svg><EdgeView edge={edge({ directed: true, label: 'w=5' })} scene={scene} /></svg>,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('marker-end')).toBe('url(#sceneArrow)')
    const text = container.querySelector('text')
    expect(text?.textContent).toBe('w=5')
  })

  it('uses dependency marker for dependency variant', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 0)])
    const { container } = render(
      <svg><EdgeView edge={edge({ directed: true, variant: 'dependency' })} scene={scene} /></svg>,
    )
    expect(container.querySelector('path')?.getAttribute('marker-end')).toBe('url(#sceneDependencyArrow)')
  })

  it('uses color-matched trajectory marker for dashed+curved success edges', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 50)])
    const e = edge({
      directed: true,
      style: { dashed: true, curved: true, color: 'success' },
    })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    const path = container.querySelector('path')
    expect(path?.getAttribute('marker-end')).toBe('url(#sceneTrajectorySuccess)')
    // curved path uses a quadratic bezier
    expect(path?.getAttribute('d')).toContain('Q ')
    expect(path?.getAttribute('stroke-dasharray')).toBe('5 5')
  })

  it('applies pulse dash and flow class', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 0)])
    const e = edge({ state: { pulse: true }, style: { dashed: true } })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke-dasharray')).toBe('6 4')
    expect(path?.getAttribute('class')).toBe('scene-edge-flow')
  })

  it('uses edge state color over style color', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 0)])
    const e = edge({ state: { color: 'danger' }, style: { color: 'primary' } })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('#EF4444')
  })

  it('renders a self-loop arc for clockwise rotation', () => {
    const scene = sceneWith([node('a', 100, 100, 'tree.node')])
    const e = edge({ from: { entityId: 'a' }, to: { entityId: 'a' }, variant: 'clockwise' })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toContain('A ')
    expect(container.querySelector('title')?.textContent).toContain('clockwise rotation on a')
  })

  it('renders a self-loop arc for counterclockwise rotation', () => {
    const scene = sceneWith([node('a', 100, 100, 'tree.node')])
    const e = edge({ from: { entityId: 'a' }, to: { entityId: 'a' }, variant: 'counterclockwise' })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    expect(container.querySelector('path')?.getAttribute('d')).toContain('A ')
  })

  it('returns null self-loop when entity is missing', () => {
    const scene = createEmptyScene()
    const e = edge({ from: { entityId: 'a' }, to: { entityId: 'a' }, variant: 'clockwise' })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    expect(container.querySelector('path')).toBeNull()
  })

  it('uses danger and primary trajectory markers', () => {
    const scene = sceneWith([node('a', 0, 0), node('b', 200, 50)])
    const danger = render(
      <svg><EdgeView edge={edge({ directed: true, state: { color: 'danger' }, style: { dashed: true, curved: true } })} scene={scene} /></svg>,
    )
    expect(danger.container.querySelector('path')?.getAttribute('marker-end')).toBe('url(#sceneTrajectoryDanger)')
    const primary = render(
      <svg><EdgeView edge={edge({ directed: true, style: { dashed: true, curved: true, color: 'primary' } })} scene={scene} /></svg>,
    )
    expect(primary.container.querySelector('path')?.getAttribute('marker-end')).toBe('url(#sceneTrajectoryPrimary)')
  })

  it('computes a close-points curved dip', () => {
    const scene = sceneWith([node('a', 100, 100), node('b', 110, 110)])
    const { container } = render(
      <svg><EdgeView edge={edge({ style: { curved: true } })} scene={scene} /></svg>,
    )
    expect(container.querySelector('path')?.getAttribute('d')).toContain('Q ')
  })

  it('computes a horizontal curved bottom arc', () => {
    const scene = sceneWith([node('a', 0, 100), node('b', 300, 100)])
    const { container } = render(
      <svg><EdgeView edge={edge({ style: { curved: true } })} scene={scene} /></svg>,
    )
    expect(container.querySelector('path')?.getAttribute('d')).toContain('Q ')
  })

  it('computes a vertical curved side arc honoring port side', () => {
    const a = node('a', 100, 0)
    a.ports = [{ id: 'right', side: 'right', role: 'right' }]
    const scene = sceneWith([a, node('b', 100, 300)])
    const { container } = render(
      <svg><EdgeView edge={edge({ from: { entityId: 'a', portId: 'right' }, to: { entityId: 'b' }, style: { curved: true } })} scene={scene} /></svg>,
    )
    expect(container.querySelector('path')?.getAttribute('d')).toContain('Q ')
  })

  it('trims rect-node anchors at the box boundary across port sides', () => {
    const sides = ['left', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
    for (const side of sides) {
      const a = node('a', 0, 0, 'list.node')
      a.ports = [{ id: side, side, role: 'custom' }]
      const scene = sceneWith([a, node('b', 200, 200, 'list.node')])
      const e = edge({ from: { entityId: 'a', portId: side }, to: { entityId: 'b' } })
      const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
      expect(container.querySelector('path')).toBeTruthy()
    }
  })

  it('resolves a port-side anchor and trims toward circle boundary', () => {
    const a = node('a', 0, 0)
    a.ports = [{ id: 'right', side: 'right', role: 'right' }]
    const scene = sceneWith([a, node('b', 200, 0)])
    const e = edge({ from: { entityId: 'a', portId: 'right' }, to: { entityId: 'b' } })
    const { container } = render(<svg><EdgeView edge={e} scene={scene} /></svg>)
    expect(container.querySelector('title')?.textContent).toContain('a.right → b')
    expect(container.querySelector('path')).toBeTruthy()
  })
})
