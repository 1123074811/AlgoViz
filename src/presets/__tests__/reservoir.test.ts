import { describe, it, expect } from 'vitest'
import { generateReservoir } from '../reservoir'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateReservoir', () => {
  it('走 prob.* 且首帧有水塘槽位', () => {
    const script = generateReservoir([10, 20, 30, 40, 50])
    expect(script.presentation?.module).toBe('prob')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'prob.reservoir')).toBe(true)
    const scene = deriveSceneState(script, 1)
    expect(Object.keys(scene.entities).some(k => k.startsWith('prob_res_'))).toBe(true)
  })
})
