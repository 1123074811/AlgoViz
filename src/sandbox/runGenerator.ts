import type { GeneratorResult, GeneratorMeta } from './executeGenerator'
import { executeGenerator } from './executeGenerator'

/** Run an AI-generated generator in an isolated Web Worker with a hard timeout.
 *  Falls back to inline execution if Workers are unavailable (e.g. test env). */
export function runGeneratorSandboxed(
  source: string,
  input: unknown,
  meta: GeneratorMeta,
  timeoutMs = 5000,
): Promise<GeneratorResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(executeGenerator(source, input, meta))
  }
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./generatorWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      resolve(executeGenerator(source, input, meta))
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
      resolve({ ok: false, error: '生成器执行出错: ' + ev.message, kind: 'runtime' })
    }
    worker.postMessage({ source, input, meta })
  })
}
