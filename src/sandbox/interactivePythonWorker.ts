const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'
// Keep this classic Worker free of runtime imports: Pyodide loads through importScripts.
const STDIN_HEADER_BYTES = 8
const STDIN_STATE_INDEX = 0
const STDIN_LENGTH_INDEX = 1

type WorkerRequest = {
  type: 'start' | 'stdin' | 'cancel'
  code?: string
  stdinBuffer?: SharedArrayBuffer
}
type WorkerEvent =
  | { type: 'compiling' | 'running' }
  | { type: 'stdout' | 'stderr'; data: string }
  | { type: 'stdin-request'; requestId: number }
  | { type: 'result'; value: unknown }
  | { type: 'trace'; event: unknown }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string }

interface PyodideLike {
  globals: { set: (name: string, value: unknown) => void }
  runPythonAsync: (code: string) => Promise<unknown>
  setStdin: (options: { read: (buffer: Uint8Array) => number; isatty?: boolean }) => void
  setStdout: (options: { write: (buffer: Uint8Array) => number }) => void
  setStderr: (options: { write: (buffer: Uint8Array) => number }) => void
}

let pyodidePromise: Promise<PyodideLike> | undefined
let running = false
let nextRequestId = 1

const post = (event: WorkerEvent) => self.postMessage(event)

function ensurePyodide(): Promise<PyodideLike> {
  pyodidePromise ??= (async () => {
    ;(self as unknown as { importScripts: (url: string) => void }).importScripts(PYODIDE_URL)
    const loadPyodide = (self as unknown as {
      loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>
    }).loadPyodide
    return loadPyodide({ indexURL: PYODIDE_URL.replace(/\/pyodide\.js$/, '/') })
  })()
  return pyodidePromise
}

function createStdinReader(buffer: SharedArrayBuffer): (target: Uint8Array) => number {
  const header = new Int32Array(buffer, 0, STDIN_HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT)
  const payload = new Uint8Array(buffer, STDIN_HEADER_BYTES)
  let pending = new Uint8Array()
  let offset = 0

  return target => {
    if (offset >= pending.length) {
      Atomics.store(header, STDIN_STATE_INDEX, 0)
      const requestId = nextRequestId++
      post({ type: 'stdin-request', requestId })
      Atomics.wait(header, STDIN_STATE_INDEX, 0)
      const length = Atomics.load(header, STDIN_LENGTH_INDEX)
      pending = payload.slice(0, length)
      offset = 0
      post({ type: 'running' })
    }
    const length = Math.min(target.length, pending.length - offset)
    target.set(pending.subarray(offset, offset + length))
    offset += length
    return length
  }
}

function installStreams(pyodide: PyodideLike, stdinBuffer: SharedArrayBuffer): void {
  const stdoutDecoder = new TextDecoder()
  const stderrDecoder = new TextDecoder()
  pyodide.setStdin({ read: createStdinReader(stdinBuffer), isatty: true })
  pyodide.setStdout({
    write(buffer) {
      post({ type: 'stdout', data: stdoutDecoder.decode(buffer, { stream: true }) })
      return buffer.length
    },
  })
  pyodide.setStderr({
    write(buffer) {
      post({ type: 'stderr', data: stderrDecoder.decode(buffer, { stream: true }) })
      return buffer.length
    },
  })
}

async function execute(code: string, stdinBuffer: SharedArrayBuffer): Promise<void> {
  if (running) {
    post({ type: 'error', message: 'Python 会话仍在运行' })
    return
  }
  running = true
  post({ type: 'compiling' })

  try {
    const pyodide = await ensurePyodide()
    installStreams(pyodide, stdinBuffer)
    pyodide.globals.set('__algoviz_emit_result', (json: string) => {
      post({ type: 'result', value: JSON.parse(json) })
    })
    pyodide.globals.set('__algoviz_emit_trace', (json: string) => {
      post({ type: 'trace', event: JSON.parse(json) })
    })
    const prelude = [
      'import json as __algoviz_json',
      'def emit_result(value):',
      '    __algoviz_emit_result(__algoviz_json.dumps(value, ensure_ascii=False, default=str))',
      'def emit_trace(event):',
      '    __algoviz_emit_trace(__algoviz_json.dumps(event, ensure_ascii=False, default=str))',
      '',
    ].join('\n')
    post({ type: 'running' })
    await pyodide.runPythonAsync(`${prelude}${code}`)
    post({ type: 'exit', code: 0 })
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    running = false
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type !== 'start') return
  if (!request.stdinBuffer) {
    post({ type: 'error', message: 'Python stdin 共享缓冲区缺失' })
    return
  }
  void execute(request.code ?? '', request.stdinBuffer)
}
