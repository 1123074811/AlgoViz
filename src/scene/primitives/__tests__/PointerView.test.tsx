import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PointerView from '../PointerView'
import { createEmptyScene } from '../../types'
import type { ScenePointer, SceneState, SceneNode } from '../../types'

function makeScene(nodes: SceneNode[] = []): SceneState {
  const scene = createEmptyScene()
  for (const n of nodes) scene.entities[n.id] = n
  return scene
}

function node(id: string, x: number, y: number): SceneNode {
  return {
    id,
    type: 'node',
    variant: 'cell',
    position: { x, y },
    size: { width: 48, height: 48 },
    fields: [],
    ports: [],
  }
}

describe('PointerView', () => {
  it('renders label and arrow line when target resolves', () => {
    const scene = makeScene([node('n1', 200, 300)])
    const pointer: ScenePointer = {
      id: 'p1',
      type: 'pointer',
      label: 'i',
      target: { entityId: 'n1' },
    }
    const { container } = render(<svg><PointerView pointer={pointer} scene={scene} index={0} /></svg>)

    const text = Array.from(container.querySelectorAll('text')).find(t => t.textContent === 'i')
    expect(text).toBeTruthy()
    // arrow line present, no "null" text
    expect(container.querySelector('line')).toBeTruthy()
    expect(Array.from(container.querySelectorAll('text')).some(t => t.textContent === 'null')).toBe(false)
    // title reflects target id
    expect(container.querySelector('title')?.textContent).toContain('n1')
  })

  it('renders null indicator when target is null', () => {
    const scene = makeScene()
    const pointer: ScenePointer = {
      id: 'p2',
      type: 'pointer',
      label: 'cur',
      target: null,
      position: { x: 50, y: 60 },
    }
    const { container } = render(<svg><PointerView pointer={pointer} scene={scene} index={1} /></svg>)

    expect(container.querySelector('line')).toBeNull()
    expect(Array.from(container.querySelectorAll('text')).some(t => t.textContent === 'null')).toBe(true)
    expect(container.querySelector('title')?.textContent).toContain('null')
  })

  it('falls back to index-based x when target missing and no position', () => {
    const scene = makeScene()
    const pointer: ScenePointer = {
      id: 'p3',
      type: 'pointer',
      label: 'j',
      target: null,
    }
    const { container } = render(<svg><PointerView pointer={pointer} scene={scene} index={2} /></svg>)
    const rect = container.querySelector('rect')
    // x = 80 + 2*78 = 236 ; rect x = x - 24 = 212
    expect(Number(rect?.getAttribute('x'))).toBe(212)
  })

  it('includes portId in title when target has a port', () => {
    const n = node('n2', 100, 100)
    n.ports = [{ id: 'next', side: 'right', role: 'next' }]
    const scene = makeScene([n])
    const pointer: ScenePointer = {
      id: 'p4',
      type: 'pointer',
      label: 'head',
      target: { entityId: 'n2', portId: 'next' },
    }
    const { container } = render(<svg><PointerView pointer={pointer} scene={scene} index={0} /></svg>)
    expect(container.querySelector('title')?.textContent).toContain('.next')
  })
})
