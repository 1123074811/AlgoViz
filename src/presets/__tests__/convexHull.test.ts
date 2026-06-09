import { describe, it, expect } from 'vitest'
import { generateConvexHull } from '../convexHull'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateConvexHull', () => {
  it('走 geometry.* 且首帧有平面与点', () => {
    const script = generateConvexHull([[0, 0], [4, 0], [2, 3], [1, 1]])
    expect(script.presentation?.module).toBe('geometry')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'geometry.plane')).toBe(true)
    expect(evs.filter(e => e.type === 'geometry.point').length).toBeGreaterThanOrEqual(4)
    const scene = deriveSceneState(script, 1)
    expect(scene.entities['geo_plane']).toBeDefined()
  })
})
