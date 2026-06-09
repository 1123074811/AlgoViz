import { describe, it, expect } from 'vitest'
import { generateTarjanScc } from '../tarjanScc'
import { deriveSceneState } from '@/scene/SceneEngine'

describe('generateTarjanScc', () => {
  it('创建图 + graph_analysis 标注,末步给出分组', () => {
    const script = generateTarjanScc()
    expect(script.presentation?.module).toBe('graph')
    const evs = script.steps.flatMap(s => s.events ?? [])
    expect(evs.some(e => e.type === 'graph.create')).toBe(true)
    expect(evs.some(e => e.type === 'graph_analysis.update')).toBe(true)
    const last = deriveSceneState(script, script.steps.length)
    const marker = last.entities['gan_marker']
    expect(marker).toBeDefined()
    // 末步的分组模型应覆盖全部 4 个结点
    const model = (marker as { meta?: { components?: Record<string, number> } }).meta
    expect(Object.keys(model?.components ?? {}).sort()).toEqual(['0', '1', '2', '3'])
  })
})
