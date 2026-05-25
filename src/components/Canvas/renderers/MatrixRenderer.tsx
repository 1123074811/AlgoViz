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
  const cellW = 90 / cols
  const cellH = Math.min(90 / rows, 90 / cols)

  // Compute flat index for color map lookup
  const getFlatIdx = (r: number, c: number) => r * cols + c

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${(100 - cols * cellW) / 2}, ${(100 - rows * cellH) / 2})`}>
        {matrix.map((row, r) =>
          row.map((value, c) => {
            const flatIdx = getFlatIdx(r, c)
            const color = COLOR_MAP[colorMap.get(flatIdx) || 'primary'] || COLOR_MAP.primary

            return (
              <g key={`${r}-${c}`}>
                <rect
                  x={`${c * cellW}%`}
                  y={`${r * cellH}%`}
                  width={`${cellW}%`}
                  height={`${cellH}%`}
                  rx="1"
                  fill={color}
                  fillOpacity="0.2"
                  stroke={color}
                  strokeWidth="0.3"
                  style={{ transition: 'fill 300ms ease, stroke 300ms ease' }}
                />
                <text
                  x={`${(c + 0.5) * cellW}%`}
                  y={`${(r + 0.5) * cellH}%`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={cellW > 10 ? '4' : '3'}
                  fontWeight="600"
                  fill={color}
                  fontFamily="var(--font-code)"
                >
                  {value}
                </text>
              </g>
            )
          })
        )}
      </g>

      {/* Row/Column labels */}
      <g fontFamily="var(--font-code)" fontSize="2" fill="var(--color-muted)">
        {Array.from({ length: rows }, (_, r) => (
          <text key={`rl-${r}`} x="2" y={`${(100 - rows * cellH) / 2 + (r + 0.5) * cellH}%`} textAnchor="middle">
            {r}
          </text>
        ))}
        {Array.from({ length: cols }, (_, c) => (
          <text key={`cl-${c}`} x={`${(100 - cols * cellW) / 2 + (c + 0.5) * cellW}%`} y="97" textAnchor="middle">
            {c}
          </text>
        ))}
      </g>
    </svg>
  )
}
