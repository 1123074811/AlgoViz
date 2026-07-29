import { commands, Exit, type Tree } from '@yowasp/clang'
import { WASI } from '@runno/wasi'
import type {
  RuntimeExecutionEvent,
  RuntimeWorkerRequest,
} from '@/workbench/executionProtocol'
import { createSharedStdinReader } from './sharedStdin'

const CPP_PRELUDE = String.raw`#include <string>
extern "C" {
__attribute__((import_module("algoviz"), import_name("emit_result")))
void __algoviz_emit_result(const char* data, unsigned int length);
__attribute__((import_module("algoviz"), import_name("emit_trace")))
void __algoviz_emit_trace(const char* data, unsigned int length);
}
inline void emit_result(const std::string& json) {
  __algoviz_emit_result(json.data(), static_cast<unsigned int>(json.size()));
}
inline void emit_trace(const std::string& json) {
  __algoviz_emit_trace(json.data(), static_cast<unsigned int>(json.size()));
}
#line 1 "main.cpp"
`

let running = false
let nextRequestId = 1

const post = (event: RuntimeExecutionEvent) => self.postMessage(event)

function emitBytes(
  decoder: TextDecoder,
  type: 'stderr' | 'stdout',
  bytes: Uint8Array | null,
): void {
  const data = bytes
    ? decoder.decode(bytes, { stream: true })
    : decoder.decode()
  if (data) post({ type, data })
}

function readGuestText(
  memory: WebAssembly.Memory | undefined,
  pointer: number,
  length: number,
): string {
  if (!memory) throw new Error('C++ 运行时内存尚未初始化')
  return new TextDecoder().decode(new Uint8Array(memory.buffer, pointer, length))
}

async function compile(code: string): Promise<Uint8Array> {
  const stdoutDecoder = new TextDecoder()
  const stderrDecoder = new TextDecoder()
  let files: Tree | undefined
  try {
    files = await commands['clang++'](
      ['main.cpp', '-std=c++20', '-O0', '-o', 'program.wasm'],
      { 'main.cpp': `${CPP_PRELUDE}${code}` },
      {
        stdout: bytes => emitBytes(stdoutDecoder, 'stderr', bytes),
        stderr: bytes => emitBytes(stderrDecoder, 'stderr', bytes),
        fetchProgress: () => undefined,
      },
    )
  } finally {
    emitBytes(stdoutDecoder, 'stderr', null)
    emitBytes(stderrDecoder, 'stderr', null)
  }

  const program = files?.['program.wasm']
  if (!(program instanceof Uint8Array)) throw new Error('C++ 编译未生成 WASI 程序')
  return program
}

async function execute(code: string, stdinBuffer: SharedArrayBuffer): Promise<void> {
  if (running) {
    post({ type: 'error', message: 'C++ 会话仍在运行' })
    return
  }
  running = true
  post({ type: 'compiling' })

  try {
    const program = await compile(code)
    post({ type: 'running' })

    let waitingForInput = false
    const readStdin = createSharedStdinReader(stdinBuffer, () => {
      waitingForInput = true
      post({ type: 'stdin-request', requestId: nextRequestId++ })
    })
    const wasi = new WASI({
      args: ['program.wasm'],
      stdin(maxByteLength) {
        const value = readStdin(maxByteLength)
        if (waitingForInput) {
          waitingForInput = false
          post({ type: 'running' })
        }
        return value
      },
      stdout: data => post({ type: 'stdout', data }),
      stderr: data => post({ type: 'stderr', data }),
    })

    let memory: WebAssembly.Memory | undefined
    const module = await WebAssembly.compile(Uint8Array.from(program))
    const instance = await WebAssembly.instantiate(module, {
      ...wasi.getImportObject(),
      algoviz: {
        emit_result(pointer: number, length: number) {
          const json = readGuestText(memory, pointer, length)
          try {
            post({ type: 'result', value: JSON.parse(json) })
          } catch {
            throw new Error('emit_result() 必须传入合法 JSON')
          }
        },
        emit_trace(pointer: number, length: number) {
          const json = readGuestText(memory, pointer, length)
          try {
            post({ type: 'trace', event: JSON.parse(json) })
          } catch {
            post({ type: 'trace', event: json })
          }
        },
      },
    })
    memory = instance.exports.memory as WebAssembly.Memory
    const result = wasi.start({ module, instance })
    post({ type: 'exit', code: result.exitCode })
  } catch (error) {
    const message = error instanceof Exit
      ? `C++ 编译失败，Clang 退出码 ${error.code}`
      : error instanceof Error ? error.message : String(error)
    post({ type: 'error', message })
  } finally {
    running = false
  }
}

self.onmessage = (event: MessageEvent<RuntimeWorkerRequest>) => {
  const request = event.data
  if (request.type !== 'start') return
  if (!request.stdinBuffer) {
    post({ type: 'error', message: 'C++ stdin 共享缓冲区缺失' })
    return
  }
  void execute(request.code, request.stdinBuffer)
}
