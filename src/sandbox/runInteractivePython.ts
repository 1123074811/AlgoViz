import type { ExecutionSessionState } from '@/workbench/executionProtocol'
import {
  failedInteractiveSession,
  startInteractiveSession,
  type InteractiveExecutionSession,
  type InteractiveWorker,
} from './runInteractiveSession'
import { createSharedStdinBuffer, writeSharedStdin } from './sharedStdin'

let pythonWorker: InteractiveWorker | undefined

export function isInteractivePython(code: string): boolean {
  return /\binput\s*\(/.test(code)
    || /\bif\s+__name__\s*==\s*(['"])__main__\1\s*:/.test(code)
}

function createPythonWorker(): InteractiveWorker {
  pythonWorker ??= new Worker(new URL('./interactivePythonWorker.ts', import.meta.url), {
    type: 'classic',
  })
  return pythonWorker
}

export const writePythonStdin = writeSharedStdin

export function startInteractivePythonSession(
  code: string,
  onStateChange: (state: ExecutionSessionState) => void,
  timeoutMs = 30_000,
  workerFactory: () => InteractiveWorker = createPythonWorker,
  stdinBufferFactory: () => SharedArrayBuffer = () => createSharedStdinBuffer('Python'),
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
      pythonWorker = undefined
    },
    sendInput: (_worker, _state, value) => writeSharedStdin(stdinBuffer, value),
  })
}
