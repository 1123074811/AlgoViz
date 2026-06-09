import { describe, it, expect } from 'vitest'
import { generateGCD } from '../gcd'
import { generatePreset } from '../generators'
import { getCodeTemplate } from '@/data/codeTemplates'
import { deriveSceneState } from '@/scene'
import { getLeetCodeDefault, getLeetCodePlaceholder, parseAlgorithmInput } from '@/utils/inputParser'

function allEvents(script: ReturnType<typeof generateGCD>) {
  return script.steps.flatMap(step => step.events ?? [])
}

function finalNote(script: ReturnType<typeof generateGCD>): string {
  const notes = allEvents(script).filter((event): event is { type: 'scene.note'; text: string } => event.type === 'scene.note')
  return notes[notes.length - 1]?.text ?? ''
}

describe('gcd_euclidean preset', () => {
  it('generates Euclidean steps for array input', () => {
    const script = generateGCD([48, 18])
    const events = allEvents(script)

    expect(script.algorithm).toBe('gcd_euclidean')
    expect(script.initialState.data).toEqual([48, 18])
    expect(events.some(event => event.type === 'math.init')).toBe(true)
    expect(events.some(event => event.type === 'math.set')).toBe(true)
    expect(finalNote(script)).toContain('gcd = a = 6')
  })

  it('accepts object input with a and b', () => {
    const script = generateGCD({ a: 84, b: 30 })
    const events = allEvents(script)

    expect(script.algorithm).toBe('gcd_euclidean')
    expect(script.initialState.data).toEqual([84, 30])
    expect(events.some(event => event.type === 'math.init')).toBe(true)
    expect(events.some(event => event.type === 'math.set')).toBe(true)
    expect(finalNote(script)).toContain('gcd = a = 6')
  })

  it('handles zero input without looping', () => {
    const script = generateGCD([0, 18])
    const events = allEvents(script)

    expect(script.algorithm).toBe('gcd_euclidean')
    expect(script.initialState.data).toEqual([0, 18])
    expect(events.some(event => event.type === 'math.init')).toBe(true)
    expect(events.some(event => event.type === 'math.set')).toBe(true)
    expect(finalNote(script)).toContain('gcd = a = 18')
  })

  it('is registered in dynamic preset generators', () => {
    const script = generatePreset('gcd_euclidean', [48, 18])

    expect(script?.algorithm).toBe('gcd_euclidean')
    expect(script?.initialState.data).toEqual([48, 18])
  })

  it('has language templates instead of editor fallback text', () => {
    const languages = ['python', 'javascript', 'cpp', 'java'] as const

    for (const lang of languages) {
      const code = getCodeTemplate('gcd_euclidean', lang)
      expect(code).toContain('gcd')
      expect(code).not.toContain('code template not available')
    }
  })

  it('uses a and b defaults in LeetCode input mode', () => {
    expect(getLeetCodePlaceholder('gcd_euclidean')).toBe('a = 48, b = 18')
    expect(getLeetCodeDefault('gcd_euclidean')).toBe('a = 48, b = 18')
    expect(parseAlgorithmInput('a = 84, b = 30', 'leetcode', 'gcd_euclidean')).toEqual({ a: 84, b: 30 })
  })

  it('renders input-driven variable cells on the initial scene frame', () => {
    const script = generateGCD({ a: 48, b: 18 })
    const scene = deriveSceneState(script, 0)

    expect(scene.entities.arr_0).toBeUndefined()
    expect(scene.entities.arr_1).toBeUndefined()
    expect(scene.entities.mathvar_a?.type).toBe('cell')
    expect(scene.entities.mathvar_b?.type).toBe('cell')
    expect(scene.entities.mathvar_a?.type === 'cell' ? scene.entities.mathvar_a.value : null).toBe('48')
    expect(scene.entities.mathvar_b?.type === 'cell' ? scene.entities.mathvar_b.value : null).toBe('18')
  })
})
