import { describe, it, expect } from 'vitest'
import { generateSkipList } from '../skipList'
import { deriveSceneState } from '../../scene/SceneEngine'

describe('generateSkipList', () => {
  it('emits a real right/down search trace without rescanning from head', () => {
    const s = generateSkipList([1, 3, 4, 7, 9, 12], 9)
    const types = s.steps.flatMap(st => (st.events ?? []).map(e => e.type))
    expect(types).toEqual([
      'skip_list.create',
      'skip_list.compare',
      'skip_list.move_right',
      'skip_list.drop_down',
      'skip_list.compare',
      'skip_list.drop_down',
      'skip_list.compare',
      'skip_list.found',
    ])
    expect(s.result).toBe(true)
    expect(s.steps).toHaveLength(8)
  })

  it('reaches the bottom and emits miss for an absent target', () => {
    const s = generateSkipList([1, 3, 4, 7, 9, 12], 8)
    const events = s.steps.flatMap(step => step.events ?? [])
    expect(events[events.length - 1]?.type).toBe('skip_list.miss')
    expect(s.result).toBe(false)
  })

  it('uses a default target that demonstrates right and down movement', () => {
    const script = generateSkipList([5, 3, 8, 1, 9, 2])
    const types = script.steps.flatMap(step => (step.events ?? []).map(event => event.type))
    expect(types).toContain('skip_list.move_right')
    expect(types).toContain('skip_list.drop_down')
    expect(script.steps.length).toBeGreaterThan(5)
  })

  it('does not seed a duplicate array row', () => {
    const scene = deriveSceneState(generateSkipList([1, 3, 4], 4), 0)
    expect(Object.keys(scene.entities).some(id => id.startsWith('arr_'))).toBe(false)
    expect(Object.keys(scene.entities).some(id => id.startsWith('sl_'))).toBe(true)
  })
})
