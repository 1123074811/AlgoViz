import {
  INITIAL_EXECUTION_SESSION,
  reduceExecutionEvent,
  type ExecutionSessionState,
  type RuntimeExecutionEvent,
  type RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'

export type InteractiveWorker = Pick<
  Worker,
  'postMessage' | 'terminate' | 'onmessage' | 'onerror'
>

export interface InteractiveExecutionSession {
  result: Promise<ExecutionSessionState>
  sendInput(value: string): void
  cancel(): void
}

interface InteractiveSessionOptions {
  startRequest: RuntimeWorkerRequest
  createWorker: () => InteractiveWorker
  timeoutMs: number
  onStateChange: (state: ExecutionSessionState) => void
  sendInput?: (
    worker: InteractiveWorker,
    state: ExecutionSessionState,
    value: string,
  ) => void
  keepWorkerAlive?: boolean
  onWorkerTerminated?: () => void
}

export function failedInteractiveSession(
  message: string,
  onStateChange: (state: ExecutionSessionState) => void,
): InteractiveExecutionSession {
  const state = reduceExecutionEvent(INITIAL_EXECUTION_SESSION, { type: 'error', message })
  onStateChange(state)
  return {
    result: Promise.resolve(state),
    sendInput() {},
    cancel() {},
  }
}

export function startInteractiveSession({
  startRequest,
  createWorker,
  timeoutMs,
  onStateChange,
  sendInput,
  keepWorkerAlive = false,
  onWorkerTerminated,
}: InteractiveSessionOptions): InteractiveExecutionSession {
  let state = INITIAL_EXECUTION_SESSION
  let worker: InteractiveWorker | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let settled = false
  let resolveResult!: (state: ExecutionSessionState) => void
  const result = new Promise<ExecutionSessionState>(resolve => {
    resolveResult = resolve
  })

  const stopTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const terminateWorker = () => {
    worker?.terminate()
    onWorkerTerminated?.()
  }
  const finish = () => {
    if (settled) return
    settled = true
    stopTimer()
    if (!keepWorkerAlive || state.phase !== 'finished') terminateWorker()
    resolveResult(state)
  }
  const apply = (event: RuntimeExecutionEvent) => {
    state = reduceExecutionEvent(state, event)
    onStateChange(state)
    stopTimer()
    if (state.phase === 'compiling' || state.phase === 'running') {
      timer = setTimeout(() => {
        apply({ type: 'error', message: `用户代码执行超时(>${timeoutMs}ms)` })
      }, timeoutMs)
    } else if (
      state.phase === 'finished'
      || state.phase === 'error'
      || state.phase === 'cancelled'
    ) {
      finish()
    }
  }

  try {
    worker = createWorker()
    worker.onmessage = event => apply(event.data as RuntimeExecutionEvent)
    worker.onerror = event => apply({
      type: 'error',
      message: event instanceof ErrorEvent && event.message
        ? `用户代码在沙箱中崩溃: ${event.message}`
        : '用户代码在沙箱中崩溃',
    })
    worker.postMessage(startRequest)
  } catch {
    apply({
      type: 'error',
      message: '当前环境无法创建安全的 Web Worker，已拒绝执行用户代码',
    })
  }

  return {
    result,
    sendInput(value) {
      if (!worker || state.phase !== 'waiting-input' || !state.stdinRequest) return
      try {
        if (sendInput) {
          sendInput(worker, state, value)
        } else {
          worker.postMessage({
            type: 'stdin',
            requestId: state.stdinRequest.requestId,
            value,
          } satisfies RuntimeWorkerRequest)
        }
      } catch (error) {
        apply({ type: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    },
    cancel() {
      if (settled) return
      worker?.postMessage({ type: 'cancel' } satisfies RuntimeWorkerRequest)
      apply({ type: 'cancelled' })
    },
  }
}
