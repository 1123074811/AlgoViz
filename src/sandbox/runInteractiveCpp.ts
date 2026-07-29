import type { ExecutionSessionState } from '@/workbench/executionProtocol'
import {
  failedInteractiveSession,
  startInteractiveSession,
  type InteractiveExecutionSession,
  type InteractiveWorker,
} from './runInteractiveSession'
import { createSharedStdinBuffer, writeSharedStdin } from './sharedStdin'

let cppWorker: InteractiveWorker | undefined

export function isInteractiveCpp(code: string): boolean {
  return /\b(?:int|signed|auto)\s+main\s*\(/.test(code)
}

function createCppWorker(): InteractiveWorker {
  cppWorker ??= new Worker(new URL('./interactiveCppWorker.ts', import.meta.url), {
    type: 'module',
  })
  return cppWorker
}

export function startInteractiveCppSession(
  code: string,
  onStateChange: (state: ExecutionSessionState) => void,
  timeoutMs = 60_000,
  workerFactory: () => InteractiveWorker = createCppWorker,
  stdinBufferFactory: () => SharedArrayBuffer = () => createSharedStdinBuffer('C++'),
): InteractiveExecutionSession {
  let stdinBuffer: SharedArrayBuffer
  try {
    stdinBuffer = stdinBufferFactory()
  } catch (error) {
    return failedInteractiveSession(
      error instanceof Error ? error.message : String(error),
      onStateChange,
    )
  }

  return startInteractiveSession({
    startRequest: { type: 'start', code, stdinBuffer },
    createWorker: workerFactory,
    timeoutMs,
    onStateChange,
    keepWorkerAlive: true,
    onWorkerTerminated: () => {
      cppWorker = undefined
    },
    sendInput: (_worker, _state, value) => writeSharedStdin(stdinBuffer, value),
  })
}
