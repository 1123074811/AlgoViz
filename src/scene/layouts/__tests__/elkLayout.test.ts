import { describe, expect, it } from 'vitest'
import type { AnimationScript } from '@/types/animation'
import { deriveSceneState } from '../../SceneEngine'
import { generateSkipList } from '../../../presets/skipList'
import { generateBinaryTree } from '../../../presets/binaryTree'
import { applyElkLayout, createElkLayoutTask, elkPilotMode } from '../elkLayout'

describe('ELK compatible topology layout', () => {
  it('maps skip-list towers to ordered ELK columns', () => {
    const script = generateSkipList([1, 3, 4, 7], 4)
    const scene = deriveSceneState(script, 0)
    const mode = elkPilotMode(script, scene)
    const task = mode ? createElkLayoutTask(scene, mode) : null
    expect(mode).toBe('skip-list')
    expect(task?.graph.children).toHaveLength(5)
    expect(task?.graph.layoutOptions?.['elk.direction']).toBe('RIGHT')
  })

  it('enables ELK for every connected tree scene instead of an algorithm allow-list', () => {
    const script = generateBinaryTree([8, 3, 10, 1, 6, null, 14])
    const scene = deriveSceneState(script, 0)
    expect(elkPilotMode(script, scene)).toBe('tree')
  })

  it('enables ELK for small undirected graph scenes', () => {
    const script = {
      algorithm: 'small_graph',
      complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
      initialState: { type: 'graph', data: [] },
      steps: [{
        stepId: 1,
        codeLine: 0,
        description: { zh: '建图', en: 'create' },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{
          type: 'graph.create',
          nodes: [{ id: 'A' }, { id: 'B' }],
          edges: [{ source: 'A', target: 'B' }],
          directed: false,
        }],
        stats: { comparisons: 0, swaps: 0, accesses: 0 },
      }],
    } satisfies AnimationScript
    const scene = deriveSceneState(script, 1)
    expect(elkPilotMode(script, scene)).toBe('graph')
  })

  it('applies ELK node positions and routed sections back to Scene', () => {
    const script = {
      algorithm: 'btree',
      presentation: { engine: 'scene', module: 'tree' },
    } as AnimationScript
    const scene = deriveSceneState({
      ...script,
      complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
      initialState: { type: 'tree', data: [] },
      steps: [{
        stepId: 1,
        codeLine: 0,
        description: { zh: '建树', en: 'create' },
        action: { type: 'highlight', targets: [], color: 'primary' },
        events: [{
          type: 'tree.create',
          variant: 'btree',
          rootId: 'root',
          nodes: [{ id: 'root', value: '[2]' }, { id: 'leaf', value: '[1]' }],
          edges: [{ parentId: 'root', childId: 'leaf' }],
        }],
        stats: { comparisons: 0, swaps: 0, accesses: 0 },
      }],
    }, 1)
    const task = createElkLayoutTask(scene, 'tree')!
    const edgeId = task.graph.edges?.[0].id ?? ''
    const result = {
      ...task.graph,
      children: [
        { id: 'root', x: 0, y: 0, width: 96, height: 44 },
        { id: 'leaf', x: 0, y: 140, width: 96, height: 44 },
      ],
      edges: [{
        id: edgeId,
        sources: ['root'],
        targets: ['leaf'],
        sections: [{ id: 's', startPoint: { x: 48, y: 44 }, bendPoints: [{ x: 48, y: 90 }], endPoint: { x: 48, y: 140 } }],
      }],
    }
    const laidOut = applyElkLayout(scene, task, result)
    expect(laidOut.entities.root.type === 'node' && laidOut.entities.root.position.y).toBe(90)
    expect(laidOut.edges[edgeId].route).toHaveLength(3)
  })
})
