import type { ExecutionSessionState } from '@/workbench/executionProtocol'
import {
  startInteractiveSession,
  type InteractiveExecutionSession,
  type InteractiveWorker,
} from './runInteractiveSession'
import { resolveJavaEntryPoint } from './javaEntryPoint'

let javaWorker: InteractiveWorker | undefined

export function isInteractiveJava(code: string): boolean {
  return resolveJavaEntryPoint(code) !== null
}

function createJavaWorker(): InteractiveWorker {
  javaWorker ??= new Worker(new URL('./interactiveJavaWorker.ts', import.meta.url), {
    type: 'module',
  })
  return javaWorker
}

export function startInteractiveJavaSession(
  code: string,
  onStateChange: (state: ExecutionSessionState) => void,
  timeoutMs = 60_000,
  workerFactory: () => InteractiveWorker = createJavaWorker,
): InteractiveExecutionSession {
  return startInteractiveSession({
    startRequest: { type: 'start', code },
    createWorker: workerFactory,
    timeoutMs,
    onStateChange,
    keepWorkerAlive: true,
    onWorkerTerminated: () => {
      javaWorker = undefined
    },
  })
}
