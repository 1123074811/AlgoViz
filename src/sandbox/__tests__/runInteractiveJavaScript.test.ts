import { describe, expect, it, vi } from 'vitest'
import {
  isInteractiveJavaScript,
  startInteractiveJavaScriptSession,
} from '../runInteractiveJavaScript'
import type {
  RuntimeExecutionEvent,
  RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'

class FakeWorker {
  onmessage: ((event: MessageEvent<RuntimeExecutionEvent>) => void) | null = null
  onerror: OnErrorEventHandler = null
  sent: RuntimeWorkerRequest[] = []
  terminated = false

  postMessage(message: RuntimeWorkerRequest) {
    this.sent.push(message)
  }

  terminate() {
    this.terminated = true
  }

  emit(data: RuntimeExecutionEvent) {
    this.onmessage?.({ data } as MessageEvent<RuntimeExecutionEvent>)
  }
}

describe('interactive JavaScript session', () => {
  it('continues the same worker after stdin and streams result', async () => {
    const worker = new FakeWorker()
    const states: string[] = []
    const session = startInteractiveJavaScriptSession(
      'async function main() {}',
      state => states.push(state.phase),
      3000,
      () => worker as unknown as Worker,
    )

    expect(worker.sent[0]).toEqual({ type: 'start', code: 'async function main() {}' })
    worker.emit({ type: 'compiling' })
    worker.emit({ type: 'running' })
    worker.emit({ type: 'stdout', data: 'n? ' })
    worker.emit({ type: 'stdin-request', requestId: 7, prompt: '请输入 n' })
    session.sendInput('5')
    expect(worker.sent[worker.sent.length - 1]).toEqual({
      type: 'stdin',
      requestId: 7,
      value: '5',
    })

    worker.emit({ type: 'running' })
    worker.emit({ type: 'result', value: 10 })
    worker.emit({ type: 'exit', code: 0 })

    await expect(session.result).resolves.toMatchObject({
      phase: 'finished',
      stdout: 'n? ',
      result: 10,
      exitCode: 0,
    })
    expect(states).toContain('waiting-input')
    expect(worker.terminated).toBe(true)
  })

  it('does not count waiting for stdin toward the CPU timeout', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker()
    const session = startInteractiveJavaScriptSession(
      'async function main() {}',
      () => undefined,
      100,
      () => worker as unknown as Worker,
    )
    worker.emit({ type: 'running' })
    worker.emit({ type: 'stdin-request', requestId: 1 })
    await vi.advanceTimersByTimeAsync(500)
    expect(worker.terminated).toBe(false)

    worker.emit({ type: 'running' })
    await vi.advanceTimersByTimeAsync(101)
    await expect(session.result).resolves.toMatchObject({
      phase: 'error',
      error: '用户代码执行超时(>100ms)',
    })
    vi.useRealTimers()
  })

  it('fails closed without a worker and only detects explicit main programs', async () => {
    expect(isInteractiveJavaScript('async function main() {}')).toBe(true)
    expect(isInteractiveJavaScript('function solve(inputData) {}')).toBe(false)

    const session = startInteractiveJavaScriptSession(
      'function main() {}',
      () => undefined,
      3000,
      () => { throw new Error('worker unavailable') },
    )
    await expect(session.result).resolves.toMatchObject({
      phase: 'error',
      error: '当前环境无法创建安全的 Web Worker，已拒绝执行用户代码',
    })
  })
})
