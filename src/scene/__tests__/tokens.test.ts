import { describe, it, expect } from 'vitest'
import { SEMANTIC_COLORS, SHAPE, TYPO, MOTION, type SemanticColorName } from '../tokens'
import { CELL_KEYFRAMES, EDGE_FLOW_KEYFRAMES } from '../primitives/sharedMotion'

// 以 raw 形式加载 scene 源码用于「无硬编码色值」守卫。
// 用 import.meta.glob 而非 node:fs/__dirname —— 后者在 ESM(module: ESNext)下 tsc 不可用。
const RAW = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function rawOf(suffix: string): string {
  const key = Object.keys(RAW).find((k) => k.endsWith(suffix))
  return key ? RAW[key] : ''
}

describe('design tokens', () => {
  it('每个语义色都有 stroke/fill/text 三字段', () => {
    const names: SemanticColorName[] = ['idle', 'primary', 'compare', 'active', 'success', 'danger', 'window']
    for (const n of names) {
      expect(SEMANTIC_COLORS[n]).toBeDefined()
      expect(SEMANTIC_COLORS[n].stroke).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].fill).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(SEMANTIC_COLORS[n].text).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('形状/排版/动效令牌存在且类型正确', () => {
    expect(SHAPE.cellRadius).toBeTypeOf('number')
    expect(SHAPE.strokeWidth.base).toBeTypeOf('number')
    expect(TYPO.mono).toContain('monospace')
    expect(MOTION.easing).toMatch(/cubic-bezier/)
    expect(MOTION.duration.base).toBeTypeOf('number')
  })

  it('CellView 不再内联定义 COLOR_MAP 硬编码色板', () => {
    const src = rawOf('primitives/CellView.tsx')
    expect(src).not.toMatch(/const COLOR_MAP/)
    expect(src).toMatch(/from '\.\.\/tokens'/)
  })

  it('scene 目录(除 tokens.ts/overlays types)硬编码 #色值收敛到阈值内', () => {
    const files = [
      'primitives/NodeView.tsx', 'primitives/EdgeView.tsx', 'primitives/PointerView.tsx',
      'primitives/ContainerView.tsx', 'primitives/HashTableView.tsx', 'primitives/HeapView.tsx',
      'primitives/SetView.tsx', 'primitives/StringView.tsx', 'primitives/BitsetView.tsx',
      'primitives/VariablesView.tsx', 'primitives/RegionView.tsx', 'SceneCanvas.tsx',
    ]
    let total = 0
    for (const f of files) {
      const src = rawOf(f)
      total += (src.match(/#[0-9A-Fa-f]{6}/g) ?? []).length
    }
    expect(total).toBeLessThanOrEqual(20)
  })

  it('共享动效常量存在且时长引用 MOTION', () => {
    expect(CELL_KEYFRAMES).toContain('@keyframes')
    expect(EDGE_FLOW_KEYFRAMES).toContain('scene-dash-flow')
  })
})
