import { useEffect, useMemo, useState } from 'react'
import ELK from 'elkjs/lib/elk-api'
import type { ElkNode } from 'elkjs/lib/elk-api'
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url'
import type { AnimationScript } from '@/types/animation'
import type { SceneState } from '../types'
import { applyElkLayout, createElkLayoutTask, elkLayoutKey, elkPilotMode } from './elkLayout'

const cache = new Map<string, ElkNode>()
let elk: InstanceType<typeof ELK> | undefined

function requestLayout(graph: ElkNode): Promise<ElkNode> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('ELK Worker unavailable'))
  elk ??= new ELK({ workerUrl: elkWorkerUrl })
  return elk.layout(graph)
}

/** Apply cached Worker-backed ELK layouts to every compatible topology. */
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
