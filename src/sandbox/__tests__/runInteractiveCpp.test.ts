import { describe, expect, it } from 'vitest'
import {
  STDIN_HEADER_BYTES,
  STDIN_LENGTH_INDEX,
  STDIN_STATE_INDEX,
  type RuntimeExecutionEvent,
  type RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'
import {
  isInteractiveCpp,
  startInteractiveCppSession,
} from '../runInteractiveCpp'

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

describe('interactive C++ session', () => {
  it('uses the shared stdin protocol and keeps the loaded compiler worker alive', async () => {
    const worker = new FakeWorker()
    const buffer = new SharedArrayBuffer(STDIN_HEADER_BYTES + 32)
    const code = 'int main() { return 0; }'
    const session = startInteractiveCppSession(
      code,
      () => undefined,
      1000,
      () => worker as unknown as Worker,
      () => buffer,
    )

    expect(worker.sent[0]).toMatchObject({ type: 'start', code, stdinBuffer: buffer })
    worker.emit({ type: 'compiling' })
    worker.emit({ type: 'running' })
    worker.emit({ type: 'stdin-request', requestId: 1 })
    session.sendInput('21')

    const header = new Int32Array(buffer, 0, 2)
    const length = Atomics.load(header, STDIN_LENGTH_INDEX)
    expect(Atomics.load(header, STDIN_STATE_INDEX)).toBe(1)
    expect(new TextDecoder().decode(new Uint8Array(buffer, STDIN_HEADER_BYTES, length))).toBe('21\n')

    worker.emit({ type: 'running' })
    worker.emit({ type: 'result', value: 42 })
    worker.emit({ type: 'exit', code: 0 })
    await expect(session.result).resolves.toMatchObject({
      phase: 'finished',
      result: 42,
    })
    expect(worker.terminated).toBe(false)
  })

  it('only recognizes a real main entry and fails closed without shared stdin', async () => {
    expect(isInteractiveCpp('int main() {}')).toBe(true)
    expect(isInteractiveCpp('signed main() {}')).toBe(true)
    expect(isInteractiveCpp('vector<int> solve(vector<int> input) {}')).toBe(false)

    const session = startInteractiveCppSession(
      'int main() {}',
      () => undefined,
      1000,
      () => new FakeWorker() as unknown as Worker,
      () => { throw new Error('cross-origin isolation missing') },
    )
    await expect(session.result).resolves.toMatchObject({
      phase: 'error',
      error: 'cross-origin isolation missing',
    })
  })
})
