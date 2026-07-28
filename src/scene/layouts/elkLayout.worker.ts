/// <reference lib="webworker" />
import ELK from 'elkjs/lib/elk.bundled.js'
import type { ElkNode } from 'elkjs/lib/elk-api'

const elk = new ELK()

self.onmessage = async (event: MessageEvent<{ id: number; graph: ElkNode }>) => {
  try {
    const graph = await elk.layout(event.data.graph)
    self.postMessage({ id: event.data.id, graph })
  } catch (error) {
    self.postMessage({ id: event.data.id, error: error instanceof Error ? error.message : String(error) })
  }
}
