import { describe, expect, it } from 'vitest'
import {
  createRuntimeTraceCompilation,
  reduceRuntimeTrace,
} from '../runtimeTraceCompiler'

function init() {
  return {
    version: 1,
    kind: 'init',
    initialState: { type: 'array', data: [3, 1] },
  }
}

describe('runtime trace compiler', () => {
  it('incrementally builds a scene-backed AnimationScript', () => {
    let state = reduceRuntimeTrace(createRuntimeTraceCompilation(), init(), 'runtime-demo')
    state = reduceRuntimeTrace(state, {
      version: 1,
      kind: 'step',
      description: '创建数组',
      events: [{ type: 'array.create', values: [3, 1] }],
    }, 'runtime-demo')
    state = reduceRuntimeTrace(state, {
      version: 1,
      kind: 'step',
      description: { zh: '交换', en: 'Swap' },
      events: [{ type: 'array.swap', indices: [0, 1] }],
      stats: { swaps: 1 },
    }, 'runtime-demo')

    expect(state.diagnostics).toEqual([])
    expect(state.script?.steps).toHaveLength(2)
    expect(state.script?.steps[1].action).toMatchObject({
      type: 'swap',
      targets: [0, 1],
    })
    expect(state.script?.steps[1].stats).toEqual({
      comparisons: 0,
      swaps: 1,
      accesses: 0,
    })
    expect(Object.keys(state.scene.entities)).toHaveLength(2)
  })

  it('requires init and rejects unknown or malformed events without changing the script', () => {
    const missingInit = reduceRuntimeTrace(createRuntimeTraceCompilation(), {
      version: 1,
      kind: 'step',
      events: [{ type: 'array.create', values: [1] }],
    }, 'runtime-demo')
    expect(missingInit.diagnostics[0].code).toBe('E_TRACE_INIT_REQUIRED')

    const initialized = reduceRuntimeTrace(createRuntimeTraceCompilation(), init(), 'runtime-demo')
    const unknown = reduceRuntimeTrace(initialized, {
      version: 1,
      kind: 'step',
      events: [{ type: 'array.teleport' }],
    }, 'runtime-demo')
    expect(unknown.diagnostics[0].code).toBe('E_TRACE_EVENT_TYPE')
    expect(unknown.script?.steps).toEqual([])

    const malformed = reduceRuntimeTrace(initialized, {
      version: 1,
      kind: 'step',
      events: [{ type: 'array.swap' }],
    }, 'runtime-demo')
    expect(malformed.diagnostics[0].code).toBe('E_TRACE_EVENT_SHAPE')
    expect(malformed.script?.steps).toEqual([])
  })

  it('rejects duplicate init and decreasing cumulative stats', () => {
    let state = reduceRuntimeTrace(createRuntimeTraceCompilation(), init(), 'runtime-demo')
    state = reduceRuntimeTrace(state, init(), 'runtime-demo')
    expect(state.diagnostics[0].code).toBe('E_TRACE_DUP_INIT')

    state = reduceRuntimeTrace(state, {
      version: 1,
      kind: 'step',
      events: [{ type: 'array.compare', indices: [0, 1] }],
      stats: { comparisons: 2 },
    }, 'runtime-demo')
    state = reduceRuntimeTrace(state, {
      version: 1,
      kind: 'step',
      events: [{ type: 'array.compare', indices: [0, 1] }],
      stats: { comparisons: 1 },
    }, 'runtime-demo')
    expect(state.diagnostics[state.diagnostics.length - 1]?.code).toBe('E_TRACE_STATS')
    expect(state.script?.steps).toHaveLength(1)
  })
})
