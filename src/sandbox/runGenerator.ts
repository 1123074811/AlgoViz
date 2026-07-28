import type { GeneratorResult, GeneratorMeta } from './executeGenerator'
import { executeGenerator } from './executeGenerator'

/** Run an AI-generated generator in an isolated Web Worker with a hard timeout.
 *  Inline execution is test-only; production fails closed if Worker creation fails. */
export function runGeneratorSandboxed(
  source: string,
  input: unknown,
  meta: GeneratorMeta,
  timeoutMs = 5000,
  allowUnsafeInline = import.meta.env.MODE === 'test',
): Promise<GeneratorResult> {
  const unavailable = () => ({
    ok: false as const,
    error: '当前环境无法创建安全的 Web Worker，已拒绝执行生成器',
    kind: 'runtime' as const,
  })
  if (typeof Worker === 'undefined') {
    return Promise.resolve(allowUnsafeInline ? executeGenerator(source, input, meta) : unavailable())
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./generatorWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(allowUnsafeInline ? executeGenerator(source, input, meta) : unavailable())
      return
    }
    const timer = setTimeout(() => {
      worker.terminate()
      resolve({ ok: false, error: `生成器执行超时（>${timeoutMs}ms），可能存在死循环`, kind: 'runtime' })
    }, timeoutMs)
    worker.onmessage = (ev: MessageEvent<GeneratorResult>) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(ev.data)
    }
    worker.onerror = (ev) => {
      clearTimeout(timer)
      worker.terminate()
      // ev.message is often empty for worker-level crashes (stack overflow or a
      // non-serializable postMessage). Surface the best available detail.
      const detail = ev.message
        || (ev as unknown as { error?: { message?: string } }).error?.message
        || '生成器在沙箱中崩溃（无错误信息，可能是栈溢出或返回了无法序列化的结果）'
      resolve({ ok: false, error: '生成器执行出错: ' + detail, kind: 'runtime' })
    }
    worker.postMessage({ source, input, meta })
  })
}
