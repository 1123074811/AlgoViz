import { describe, expect, it } from 'vitest'
import {
  INITIAL_EXECUTION_SESSION,
  formatExecutionTranscript,
  reduceExecutionEvent,
} from '../executionProtocol'

describe('execution protocol state machine', () => {
  it('keeps streamed output while pausing and resuming for stdin', () => {
    let state = reduceExecutionEvent(INITIAL_EXECUTION_SESSION, { type: 'compiling' })
    state = reduceExecutionEvent(state, { type: 'running' })
    state = reduceExecutionEvent(state, { type: 'stdout', data: 'n? ' })
    state = reduceExecutionEvent(state, {
      type: 'stdin-request',
      requestId: 1,
      prompt: '请输入 n',
    })

    expect(state.phase).toBe('waiting-input')
    expect(state.stdout).toBe('n? ')
    expect(state.stdinRequest).toEqual({ requestId: 1, prompt: '请输入 n' })

    state = reduceExecutionEvent(state, { type: 'running' })
    state = reduceExecutionEvent(state, { type: 'stdout', data: '10\n' })
    state = reduceExecutionEvent(state, { type: 'result', value: new Set([5, 10]) })
    state = reduceExecutionEvent(state, { type: 'exit', code: 0 })

    expect(state.phase).toBe('finished')
    expect(state.stdout).toBe('n? 10\n')
    expect(state.result).toEqual([5, 10])
  })

  it('keeps stderr separate and exposes a combined terminal transcript', () => {
    const state = reduceExecutionEvent(
      reduceExecutionEvent(INITIAL_EXECUTION_SESSION, { type: 'stdout', data: 'before' }),
      { type: 'stderr', data: 'failure' },
    )

    expect(formatExecutionTranscript(state)).toBe('before\nfailure')
  })
})
