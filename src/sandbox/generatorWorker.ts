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
  const result: GeneratorResult = executeGenerator(source, input, meta)
  ;(self as unknown as Worker).postMessage(result)
}
