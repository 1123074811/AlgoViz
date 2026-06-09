import { describe, it, expect } from 'vitest'
import { generateKmpAutomaton } from '../kmpAutomaton'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateKmpAutomaton', () => {
  it('走 automaton.* 且首帧有状态', () => {
    const script = generateKmpAutomaton('aba', 'ababa')
    expect(script.presentation?.module).toBe('automaton')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'automaton.create')).toBe(true)
    expect(evs.some(e => e.type === 'automaton.activate')).toBe(true)
    const scene = deriveSceneState(script, 1)
    expect(Object.keys(scene.entities).some(k => k.startsWith('auto_'))).toBe(true)
  })
})
