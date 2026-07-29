import type { ExecutionSessionState } from '@/workbench/executionProtocol'
import {
  startInteractiveSession,
  type InteractiveExecutionSession,
  type InteractiveWorker,
} from './runInteractiveSession'

export type { InteractiveExecutionSession }

export function isInteractiveJavaScript(code: string): boolean {
  return /\b(?:async\s+)?function\s+main\s*\(/.test(code)
}

export function startInteractiveJavaScriptSession(
  code: string,
  onStateChange: (state: ExecutionSessionState) => void,
  timeoutMs = 3000,
  createWorker: () => InteractiveWorker = () =>
    new Worker(new URL('./interactiveJavaScriptWorker.ts', import.meta.url), { type: 'module' }),
): InteractiveExecutionSession {
  return startInteractiveSession({
    startRequest: { type: 'start', code },
    createWorker,
    timeoutMs,
    onStateChange,
  })
}
