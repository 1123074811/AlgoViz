import { useMemo } from 'react'
import type { VisualState } from '@/hooks/useAnimationEngine'

interface MatrixRendererProps {
  visualState: VisualState & { matrix?: number[][] }
}

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  muted: 'var(--color-muted)',
}

export default function MatrixRenderer({ visualState }: MatrixRendererProps) {
  const { colorMap } = visualState

  // Treat arrayData as a square matrix if possible, or build from matrix prop
  const matrix = useMemo(() => {
    if (visualState.matrix) return visualState.matrix
    const data = visualState.arrayData
    if (data.length === 0) return null

    // Try to interpret as square matrix (n² elements → n×n grid)
    const side = Math.round(Math.sqrt(data.length))
    if (side * side === data.length && side > 1) {
      const result: number[][] = []
      for (let i = 0; i < side; i++) {
        result.push(data.slice(i * side, (i + 1) * side))
      }
      return result
    }

    // Single row matrix
    return [data]
  }, [visualState.arrayData, visualState.matrix])

  if (!matrix || matrix.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No matrix data to visualize
      </div>
    )
  }

  const rows = matrix.length
  const cols = matrix[0]?.length || 0

  // Compute flat index for color map lookup
  const getFlatIdx = (r: number, c: number) => r * cols + c

  return (
    <div className="h-full w-full overflow-auto bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">矩阵 / DP 表格</div>
        <div className="rounded-full bg-slate-100 px-2 py-1 font-code text-[11px] text-slate-500">{rows} × {cols}</div>
      </div>
      <div className="inline-grid min-w-full gap-1" style={{ gridTemplateColumns: `32px repeat(${cols}, minmax(44px, 1fr))` }}>
        <div />
        {Array.from({ length: cols }, (_, c) => (
          <div key={`col-${c}`} className="text-center font-code text-[10px] text-slate-400">{c}</div>
        ))}
        {matrix.map((row, r) => (
          row.map((value, c) => {
            const flatIdx = getFlatIdx(r, c)
            const color = COLOR_MAP[colorMap.get(flatIdx) || 'primary'] || COLOR_MAP.primary
            const isActive = colorMap.has(flatIdx)
            return (
              <div key={`${r}-${c}`} className="contents">
                {c === 0 && <div className="flex items-center justify-center font-code text-[10px] text-slate-400">{r}</div>}
                <div
                  className="min-h-10 rounded-lg border px-2 py-2 text-center font-code text-xs font-semibold transition-all"
                  style={{
                    borderColor: isActive ? color : '#E2E8F0',
                    background: isActive ? `${color}18` : '#FFFFFF',
                    color,
                    boxShadow: isActive ? `0 0 0 2px ${color}22` : undefined,
                  }}
                >
                  {Number.isFinite(value) ? value : '∞'}
                </div>
              </div>
            )
          })
        ))}
      </div>
    </div>
  )
}
