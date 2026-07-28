import { useEffect, useMemo, useState } from 'react'
import type { ElkNode } from 'elkjs/lib/elk-api'
import type { AnimationScript } from '@/types/animation'
import type { SceneState } from '../types'
import { applyElkLayout, createElkLayoutTask, elkLayoutKey, elkPilotMode } from './elkLayout'

const cache = new Map<string, ElkNode>()
let worker: Worker | undefined
let requestId = 0
const pending = new Map<number, { resolve: (graph: ElkNode) => void; reject: (error: Error) => void }>()

function requestLayout(graph: ElkNode): Promise<ElkNode> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Worker is unavailable'))
  worker ??= new Worker(new URL('./elkLayout.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage ??= (event: MessageEvent<{ id: number; graph?: ElkNode; error?: string }>) => {
    const request = pending.get(event.data.id)
    if (!request) return
    pending.delete(event.data.id)
    if (event.data.graph) request.resolve(event.data.graph)
    else request.reject(new Error(event.data.error ?? 'ELK layout failed'))
  }
  worker.onerror ??= () => {
    for (const request of pending.values()) request.reject(new Error('ELK Worker failed'))
    pending.clear()
    worker?.terminate()
    worker = undefined
  }
  const id = ++requestId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, graph })
  })
}

/** Apply cached Worker-backed ELK layouts only to the bounded pilot structures. */
export function useElkLayout(scene: SceneState, script: AnimationScript): SceneState {
  const task = useMemo(() => {
    const mode = elkPilotMode(script, scene)
    return mode ? createElkLayoutTask(scene, mode) : null
  }, [scene, script])
  const key = task ? elkLayoutKey(task) : ''
  const [layout, setLayout] = useState<{ key: string; graph: ElkNode } | null>(() => {
    const graph = key ? cache.get(key) : undefined
    return graph ? { key, graph } : null
  })

  useEffect(() => {
    if (!task || !key) return
    const cached = cache.get(key)
    if (cached) {
      queueMicrotask(() => setLayout({ key, graph: cached }))
      return
    }
    let active = true
    requestLayout(task.graph).then(graph => {
      cache.set(key, graph)
      if (active) setLayout({ key, graph })
    }).catch(() => {
      // Trusted layout failure keeps the existing deterministic Scene layout.
    })
    return () => { active = false }
  }, [key, task])

  return task && layout?.key === key ? applyElkLayout(scene, task, layout.graph) : scene
}
