import {
  INITIAL_EXECUTION_SESSION,
  reduceExecutionEvent,
  type ExecutionSessionState,
  type RuntimeExecutionEvent,
  type RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'

type InteractiveWorker = Pick<
  Worker,
  'postMessage' | 'terminate' | 'onmessage' | 'onerror'
>

export interface InteractiveExecutionSession {
  result: Promise<ExecutionSessionState>
  sendInput(value: string): void
  cancel(): void
}

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
  const finish = () => {
    if (settled) return
    settled = true
    stopTimer()
    worker?.terminate()
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
    worker.onerror = () => apply({ type: 'error', message: '用户代码在沙箱中崩溃' })
    worker.postMessage({ type: 'start', code } satisfies RuntimeWorkerRequest)
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
      worker.postMessage({
        type: 'stdin',
        requestId: state.stdinRequest.requestId,
        value,
      } satisfies RuntimeWorkerRequest)
    },
    cancel() {
      if (settled) return
      worker?.postMessage({ type: 'cancel' } satisfies RuntimeWorkerRequest)
      apply({ type: 'cancelled' })
    },
  }
}
