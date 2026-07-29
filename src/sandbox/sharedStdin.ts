import {
  DEFAULT_STDIN_BUFFER_BYTES,
  STDIN_HEADER_BYTES,
  STDIN_LENGTH_INDEX,
  STDIN_STATE_INDEX,
} from '@/workbench/executionProtocol'

export function createSharedStdinBuffer(language: string): SharedArrayBuffer {
  if (
    typeof SharedArrayBuffer === 'undefined'
    || globalThis.crossOriginIsolated !== true
  ) {
    throw new Error(`${language} 严格 stdin 需要跨源隔离；请通过 AlgoViz 开发或生产服务器访问`)
  }
  return new SharedArrayBuffer(STDIN_HEADER_BYTES + DEFAULT_STDIN_BUFFER_BYTES)
}

export function writeSharedStdin(buffer: SharedArrayBuffer, value: string): void {
  const data = new TextEncoder().encode(`${value}\n`)
  const payload = new Uint8Array(buffer, STDIN_HEADER_BYTES)
  if (data.length > payload.length) {
    throw new Error(`单次 stdin 超过 ${payload.length} 字节限制`)
  }
  payload.set(data)
  const header = new Int32Array(buffer, 0, STDIN_HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT)
  Atomics.store(header, STDIN_LENGTH_INDEX, data.length)
  Atomics.store(header, STDIN_STATE_INDEX, 1)
  Atomics.notify(header, STDIN_STATE_INDEX)
}

export function createSharedStdinReader(
  buffer: SharedArrayBuffer,
  requestInput: () => void,
): (maxByteLength: number) => string | null {
  const header = new Int32Array(buffer, 0, STDIN_HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT)
  const payload = new Uint8Array(buffer, STDIN_HEADER_BYTES)
  let pending = ''

  return maxByteLength => {
    if (!pending) {
      Atomics.store(header, STDIN_STATE_INDEX, 0)
      requestInput()
      Atomics.wait(header, STDIN_STATE_INDEX, 0)
      const length = Atomics.load(header, STDIN_LENGTH_INDEX)
      pending = new TextDecoder().decode(payload.slice(0, length))
    }
    if (!pending) return null

    let length = Math.min(pending.length, maxByteLength)
    while (length > 1 && new TextEncoder().encode(pending.slice(0, length)).length > maxByteLength) {
      length--
    }
    const chunk = pending.slice(0, length)
    pending = pending.slice(length)
    return chunk
  }
}
