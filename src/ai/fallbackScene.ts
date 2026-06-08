import type { AnimationScript, InitialState } from '@/types/animation'
import type { AlgorithmEvent } from '@/scene'

export type FallbackKind = 'unavailable' | 'parse' | 'runtime'
export interface FallbackInfo { kind: FallbackKind; message: string }

const KIND_TITLE: Record<FallbackKind, string> = {
  unavailable: '模型暂不可用',
  parse: '生成结果无法解析',
  runtime: '生成器执行失败',
}

/**
 * 任何 AI 生成失败路径的兜底脚本：至少画出 initialState（数组），
 * 并以步骤描述呈现失败原因。保证 SceneCanvas 永不空白、永不裸报错。
 * 产出始终是通过 validateAnimationScript 无 error 的合法 AnimationScript。
 */
export function buildFallbackScene(initial: InitialState, info: FallbackInfo): AnimationScript {
  const data = initial.type === 'array' && Array.isArray(initial.data) ? initial.data : []
  const title = KIND_TITLE[info.kind]
  const desc = `${title}：${info.message}。已显示原始输入，可调整代码/输入后重试。`

  const events: AlgorithmEvent[] = data.length > 0
    ? [{ type: 'array.create', values: data }]
    : []

  const steps: AnimationScript['steps'] = [
    {
      stepId: 1,
      codeLine: 0,
      description: { zh: desc, en: `${info.kind}: ${info.message}` },
      action: { type: 'highlight', targets: [], color: 'danger' },
      events,
      stats: { comparisons: 0, swaps: 0, accesses: 0 },
    },
  ]

  return {
    algorithm: 'fallback',
    complexity: { time: { best: '-', average: '-', worst: '-' }, space: '-' },
    initialState: initial,
    presentation: { engine: 'scene', module: 'array' },
    steps,
  }
}
