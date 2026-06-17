import { describe, it, expect } from 'vitest'
import { pickFocusTarget } from '../FocusLens'
import type { SceneEntity, SceneNode, SceneCell } from '../../../types'

describe('pickFocusTarget', () => {
  it('returns the center of an active node, ignoring idle entities', () => {
    const entities: SceneEntity[] = [
      { type: 'node', id: 'b', position: { x: 0, y: 0 }, state: { role: 'idle' } } as SceneNode,
      { type: 'node', id: 'a', position: { x: 100, y: 50 }, state: { role: 'active' } } as SceneNode,
      { type: 'node', id: 'c', position: { x: 200, y: 80 }, state: { role: 'idle' } } as SceneNode,
    ]
    expect(pickFocusTarget(entities)).toEqual({ x: 100, y: 50 })
  })

  it('returns null when every entity is idle', () => {
    const entities: SceneEntity[] = [
      { type: 'node', id: 'a', position: { x: 10, y: 10 }, state: { role: 'idle' } } as SceneNode,
      { type: 'cell', id: 'q_0', position: { x: 20, y: 20 }, state: { role: 'idle' } } as SceneCell,
    ]
    expect(pickFocusTarget(entities)).toBeNull()
  })

  it('returns the center of a current cell', () => {
    const entities: SceneEntity[] = [
      { type: 'cell', id: 'g0', position: { x: 7, y: 8 }, state: { role: 'current' } } as SceneCell,
    ]
    expect(pickFocusTarget(entities)).toEqual({ x: 7, y: 8 })
  })
})
