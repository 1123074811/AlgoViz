import { describe, expect, it } from 'vitest'
import type {
  RuntimeExecutionEvent,
  RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'
import {
  isInteractiveJava,
  startInteractiveJavaSession,
} from '../runInteractiveJava'
import { resolveJavaEntryPoint } from '../javaEntryPoint'

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

describe('interactive Java session', () => {
  it('resolves packaged main classes and Java main parameter forms', () => {
    expect(resolveJavaEntryPoint(`
      package demo.sort;
      public final class Main {
        public static void main(String... args) {}
      }
    `)).toEqual({
      className: 'demo.sort.Main',
      packageName: 'demo.sort',
      sourceFile: 'Main.java',
    })
    expect(isInteractiveJava('class Main { public static void main(String args[]) {} }')).toBe(true)
    expect(isInteractiveJava('class Solver { int solve(int[] input) { return 0; } }')).toBe(false)
  })

  it('continues the same cached worker after stdin and keeps it after success', async () => {
    const worker = new FakeWorker()
    const code = 'class Main { public static void main(String[] args) {} }'
    const session = startInteractiveJavaSession(
      code,
      () => undefined,
      1000,
      () => worker as unknown as Worker,
    )

    expect(worker.sent[0]).toEqual({ type: 'start', code })
    worker.emit({ type: 'compiling' })
    worker.emit({ type: 'running' })
    worker.emit({ type: 'stdin-request', requestId: 3 })
    session.sendInput('21')
    expect(worker.sent[worker.sent.length - 1]).toEqual({
      type: 'stdin',
      requestId: 3,
      value: '21',
    })

    worker.emit({ type: 'running' })
    worker.emit({ type: 'result', value: 42 })
    worker.emit({ type: 'exit', code: 0 })
    await expect(session.result).resolves.toMatchObject({
      phase: 'finished',
      result: 42,
    })
    expect(worker.terminated).toBe(false)
  })
})
