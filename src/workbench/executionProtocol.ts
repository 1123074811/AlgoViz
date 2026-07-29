import type { AnimationResult } from '@/types/animation'
import { normalizeRuntimeValue } from './runtimeContract'

export type ExecutionPhase =
  | 'idle'
  | 'compiling'
  | 'running'
  | 'waiting-input'
  | 'finished'
  | 'error'
  | 'cancelled'

export type RuntimeExecutionEvent =
  | { type: 'compiling' }
  | { type: 'running' }
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'stdin-request'; requestId: number; prompt?: string }
  | { type: 'trace'; event: unknown }
  | { type: 'result'; value: unknown }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string }
  | { type: 'cancelled' }

export type RuntimeWorkerRequest =
  | { type: 'start'; code: string }
  | { type: 'stdin'; requestId: number; value: string }
  | { type: 'cancel' }

export interface ExecutionSessionState {
  phase: ExecutionPhase
  stdout: string
  stderr: string
  result?: AnimationResult
  trace: unknown[]
  exitCode?: number
  error?: string
  stdinRequest?: { requestId: number; prompt?: string }
}

export const INITIAL_EXECUTION_SESSION: ExecutionSessionState = {
  phase: 'idle',
  stdout: '',
  stderr: '',
  trace: [],
}

export function reduceExecutionEvent(
  state: ExecutionSessionState,
  event: RuntimeExecutionEvent,
): ExecutionSessionState {
  switch (event.type) {
    case 'compiling':
      return { ...state, phase: 'compiling', error: undefined }
    case 'running':
      return { ...state, phase: 'running', stdinRequest: undefined }
    case 'stdout':
      return { ...state, stdout: state.stdout + event.data }
    case 'stderr':
      return { ...state, stderr: state.stderr + event.data }
    case 'stdin-request':
      return {
        ...state,
        phase: 'waiting-input',
        stdinRequest: { requestId: event.requestId, prompt: event.prompt },
      }
    case 'trace':
      return { ...state, trace: [...state.trace, event.event] }
    case 'result':
      return { ...state, result: normalizeRuntimeValue(event.value) }
    case 'exit':
      return {
        ...state,
        phase: event.code === 0 ? 'finished' : 'error',
        exitCode: event.code,
        stdinRequest: undefined,
        error: event.code === 0 ? undefined : `程序退出，状态码 ${event.code}`,
      }
    case 'error':
      return { ...state, phase: 'error', error: event.message, stdinRequest: undefined }
    case 'cancelled':
      return { ...state, phase: 'cancelled', stdinRequest: undefined }
  }
}

export function formatExecutionTranscript(state: ExecutionSessionState): string {
  return `${state.stdout}${state.stderr ? `${state.stdout ? '\n' : ''}${state.stderr}` : ''}`
}
