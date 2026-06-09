import { describe, it, expect } from 'vitest'
import { generateTarjanScc } from '../tarjanScc'
import { deriveSceneState } from '@/scene/SceneEngine'
import type { GraphInput } from '../bfsGraph'

describe('generateTarjanScc', () => {
  it('创建图 + graph_analysis 标注,末步给出全部结点的分组', () => {
    const script = generateTarjanScc()
    expect(script.presentation?.module).toBe('graph')
    expect(script.presentation?.layout).toBe('composite') // 复用图布局,2D 而非直线
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'graph.create')).toBe(true)
    expect(evs.some(e => e.type === 'graph_analysis.update')).toBe(true)
    const last = deriveSceneState(script, script.steps.length)
    const marker = last.entities['gan_marker']
    expect(marker).toBeDefined()
    // 末步分组应覆盖默认图(FALLBACK)的全部 5 个结点
    const model = (marker as { meta?: { components?: Record<string, number> } }).meta
    expect(Object.keys(model?.components ?? {}).sort()).toEqual(['0', '1', '2', '3', '4'])
  })

  it('栈走 teachingState(复用基础栈渲染),不在 graph_analysis 内自建', () => {
    const script = generateTarjanScc()
    // 至少有一步把当前 DFS 栈放进 teachingState.stack
    expect(script.steps.some(s => (s.teachingState?.stack?.length ?? 0) > 0)).toBe(true)
  })

  it('输入改变 → 图随之改变(响应 GraphInput)', () => {
    const custom: GraphInput = {
      nodes: ['a', 'b', 'c'].map(id => ({ id, label: id })),
      edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    }
    const script = generateTarjanScc(custom)
    const createEv = script.steps.flatMap(s => s.events ?? []).find(e => e.type === 'graph.create') as { nodes: Array<{ id: string }> }
    expect(createEv.nodes.map(n => n.id).sort()).toEqual(['a', 'b', 'c'])
  })
})
