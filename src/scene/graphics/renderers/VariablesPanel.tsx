import type { SceneCell } from '../../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../../tokens'

interface VariablesPanelProps {
  vars: SceneCell[]
}

interface VariableMeta {
  name?: string
  value?: string | number
  delta?: string
}

const MAX_VALUE_CHARS = 22
function clip(s: string): string {
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS - 1) + '…' : s
}

/**
 * 变量 / 调试器局部值面板。固定在画布左上角的 HTML 覆盖层(脱离 SVG 的缩放/平移变换)，
 * z 轴置顶，始终可见——取代旧的 in-SVG VariablesView(会随场景位置漂移)。
 * 配色走 Observable 语义色单一事实源。
 */
export default function VariablesPanel({ vars }: VariablesPanelProps) {
  if (vars.length === 0) return null
  const sorted = [...vars].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))

  return (
    <div className="absolute top-4 left-4 z-30 rounded-lg border border-slate-200 bg-white/95 shadow-sm backdrop-blur px-3 py-2 select-none pointer-events-none" style={{ minWidth: 116, maxWidth: 280 }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">变量</div>
      <div className="flex flex-col gap-1 font-mono text-xs">
        {sorted.map((c) => {
          const meta = c.meta as VariableMeta | undefined
          const name = meta?.name ?? (c.id.startsWith('mathvar_') ? c.id.slice('mathvar_'.length) : c.id)
          if (!name) return null
          const value = clip(String(c.value ?? meta?.value ?? ''))
          const delta = meta?.delta ? clip(meta.delta) : ''
          const active = Boolean(c.state?.pulse || c.state?.role === 'current' || c.state?.role === 'active')
          return (
            <div key={c.id} className="flex items-baseline gap-1.5 tabular-nums leading-tight">
              <span style={{ color: active ? SEMANTIC_COLORS.primary.stroke : NEUTRALS.labelText, fontWeight: 600 }}>{name}</span>
              <span className="text-slate-300">=</span>
              <span style={{ color: active ? SEMANTIC_COLORS.primary.stroke : SEMANTIC_COLORS.idle.text, fontWeight: active ? 700 : 500 }}>{value}</span>
              {delta && <span className="text-[11px] text-slate-400">{delta}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
