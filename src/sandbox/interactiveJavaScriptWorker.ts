import type {
  RuntimeExecutionEvent,
  RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'

const pendingInput = new Map<number, {
  resolve: (value: string) => void
  reject: (reason: Error) => void
}>()
let nextRequestId = 1
let cancelled = false

const post = (event: RuntimeExecutionEvent) => self.postMessage(event)

function formatOutput(values: unknown[]): string {
  return values.map(value => {
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }).join(' ')
}

function readLine(prompt?: string): Promise<string> {
  if (cancelled) return Promise.reject(new Error('执行已取消'))
  const requestId = nextRequestId++
  post({ type: 'stdin-request', requestId, prompt })
  return new Promise((resolve, reject) => {
    pendingInput.set(requestId, { resolve, reject })
  })
}

async function execute(code: string) {
  post({ type: 'compiling' })
  let emittedResult = false

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
      ...args: string[]
    ) => (...args: unknown[]) => Promise<unknown>
    const program = new AsyncFunction(
      'readLine',
      'write',
      'writeLine',
      'emitResult',
      'emitTrace',
      'console',
      `"use strict";\n${code}\nif (typeof main !== "function") throw new Error("未找到 main() 入口函数");\nreturn await main();`,
    )
    const write = (value: unknown = '') => post({ type: 'stdout', data: String(value) })
    const writeLine = (value: unknown = '') => post({ type: 'stdout', data: `${String(value)}\n` })
    const emitResult = (value: unknown) => {
      emittedResult = true
      post({ type: 'result', value })
    }
    const emitTrace = (event: unknown) => post({ type: 'trace', event })
    const runtimeConsole = {
      log: (...values: unknown[]) => writeLine(formatOutput(values)),
      error: (...values: unknown[]) =>
        post({ type: 'stderr', data: `${formatOutput(values)}\n` }),
    }

    post({ type: 'running' })
    const result = await program(
      readLine,
      write,
      writeLine,
      emitResult,
      emitTrace,
      runtimeConsole,
    )
    if (!emittedResult && result !== undefined) post({ type: 'result', value: result })
    post({ type: 'exit', code: 0 })
  } catch (error) {
    if (!cancelled) {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }
}

self.onmessage = (event: MessageEvent<RuntimeWorkerRequest>) => {
  const request = event.data
  if (request.type === 'start') {
    cancelled = false
    void execute(request.code)
    return
  }
  if (request.type === 'stdin') {
    const pending = pendingInput.get(request.requestId)
    if (!pending) return
    pendingInput.delete(request.requestId)
    post({ type: 'running' })
    pending.resolve(request.value)
    return
  }

  cancelled = true
  pendingInput.forEach(({ reject }) => reject(new Error('执行已取消')))
  pendingInput.clear()
  post({ type: 'cancelled' })
}
