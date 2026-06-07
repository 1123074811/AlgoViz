/// <reference lib="webworker" />
import { executeGenerator, type GeneratorResult, type GeneratorMeta } from './executeGenerator'

// Defense-in-depth: neutralize network / escape APIs inside the worker.
const w = self as unknown as Record<string, unknown>
w.fetch = undefined
w.XMLHttpRequest = undefined
w.importScripts = undefined
w.WebSocket = undefined

self.onmessage = (e: MessageEvent<{ source: string; input: unknown; meta: GeneratorMeta }>) => {
  const { source, input, meta } = e.data
  let result: GeneratorResult
  try {
    result = executeGenerator(source, input, meta)
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  try {
    ;(self as unknown as Worker).postMessage(result)
  } catch {
    // A non-serializable script/result would otherwise crash the worker (onerror
    // with an empty message). Report a clear, actionable error instead.
    ;(self as unknown as Worker).postMessage({ ok: false, error: '生成器返回了无法序列化的结果' } as GeneratorResult)
  }
}
