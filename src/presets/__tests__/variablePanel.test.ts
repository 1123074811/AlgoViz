import { describe, it, expect } from 'vitest'
import {
  generateBubbleSort,
  generateSelectionSort,
  generateInsertionSort,
  generateQuickSort,
  generateHeapSort,
  generateShellSort,
  generateCountingSort,
  generateBinarySearch,
} from '../generators'
import type { AlgorithmEvent } from '@/scene'

function allEvents(steps: { events?: AlgorithmEvent[] }[]): AlgorithmEvent[] {
  return steps.flatMap(s => s.events ?? [])
}

function firstStepEvents(steps: { events?: AlgorithmEvent[] }[]): AlgorithmEvent[] {
  return steps[0]?.events ?? []
}

const arr = [5, 3, 8, 1, 9, 2]

const cases: Array<{ name: string; script: { steps: { events?: AlgorithmEvent[] }[] }; vars: string[] }> = [
  { name: 'bubble', script: generateBubbleSort(arr), vars: ['i', 'j', '是否交换'] },
  { name: 'selection', script: generateSelectionSort(arr), vars: ['i', 'j', 'min'] },
  { name: 'insertion', script: generateInsertionSort(arr), vars: ['i', 'key', 'j'] },
  { name: 'quick', script: generateQuickSort(arr), vars: ['pivot', 'i', 'j'] },
  { name: 'heap', script: generateHeapSort(arr), vars: ['堆大小', '父', '子'] },
  { name: 'shell', script: generateShellSort(arr), vars: ['gap', 'i', 'j'] },
  { name: 'counting', script: generateCountingSort(arr), vars: ['max', 'i', '当前值'] },
  { name: 'binary', script: generateBinarySearch(arr, 8), vars: ['target', 'left', 'right', 'mid'] },
]

describe('variable panel events on built-in sort/search generators', () => {
  for (const { name, script, vars } of cases) {
    it(`${name}: emits math.init in the first step with the expected vars`, () => {
      const init = firstStepEvents(script.steps).find(e => e.type === 'math.init')
      expect(init, `${name} should emit math.init in first step`).toBeDefined()
      const names = (init as { vars: { name: string }[] }).vars.map(v => v.name)
      for (const v of vars) expect(names, `${name} init should declare ${v}`).toContain(v)
    })

    it(`${name}: emits math.set updates during the run`, () => {
      const sets = allEvents(script.steps).filter(e => e.type === 'math.set')
      expect(sets.length, `${name} should emit math.set events`).toBeGreaterThan(0)
      // every math.set name must be one of the declared vars
      const init = firstStepEvents(script.steps).find(e => e.type === 'math.init') as { vars: { name: string }[] }
      const declared = new Set(init.vars.map(v => v.name))
      for (const s of sets) {
        expect(declared, `${name} math.set name ${(s as { name: string }).name} must be declared`).toContain((s as { name: string }).name)
      }
    })
  }
})
