import { describe, expect, it } from 'vitest'
import {
  isInteractivePython,
  startInteractivePythonSession,
  writePythonStdin,
} from '../runInteractivePython'
import {
  STDIN_HEADER_BYTES,
  STDIN_LENGTH_INDEX,
  STDIN_STATE_INDEX,
  type RuntimeExecutionEvent,
  type RuntimeWorkerRequest,
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

describe('interactive Python session', () => {
  it('writes stdin bytes into the shared buffer and keeps the cached worker alive', async () => {
    const worker = new FakeWorker()
    const buffer = new SharedArrayBuffer(STDIN_HEADER_BYTES + 32)
    const session = startInteractivePythonSession(
      'name = input("name? ")',
      () => undefined,
      1000,
      () => worker as unknown as Worker,
      () => buffer,
    )

    expect(worker.sent[0]).toMatchObject({
      type: 'start',
      code: 'name = input("name? ")',
      stdinBuffer: buffer,
    })
    worker.emit({ type: 'running' })
    worker.emit({ type: 'stdin-request', requestId: 1 })
    session.sendInput('Ada')

    const header = new Int32Array(buffer, 0, 2)
    const length = Atomics.load(header, STDIN_LENGTH_INDEX)
    expect(Atomics.load(header, STDIN_STATE_INDEX)).toBe(1)
    expect(new TextDecoder().decode(new Uint8Array(buffer, STDIN_HEADER_BYTES, length))).toBe('Ada\n')

    worker.emit({ type: 'running' })
    worker.emit({ type: 'result', value: { name: 'Ada' } })
    worker.emit({ type: 'exit', code: 0 })
    await expect(session.result).resolves.toMatchObject({
      phase: 'finished',
      result: { name: 'Ada' },
    })
    expect(worker.terminated).toBe(false)
  })

  it('recognizes input-driven programs and reports unavailable shared stdin', async () => {
    expect(isInteractivePython('value = input()')).toBe(true)
    expect(isInteractivePython('if __name__ == "__main__":\n    main()')).toBe(true)
    expect(isInteractivePython('def solve(input_data):\n    return input_data')).toBe(false)

    const session = startInteractivePythonSession(
      'value = input()',
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

  it('rejects a stdin line larger than the shared payload', () => {
    const buffer = new SharedArrayBuffer(STDIN_HEADER_BYTES + 2)
    expect(() => writePythonStdin(buffer, 'too long')).toThrow('单次 stdin 超过 2 字节限制')
  })
})
