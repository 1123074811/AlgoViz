import type { VisualState } from '@/hooks/useAnimationEngine'
import type { AnimationStep } from '@/types/animation'

const COLOR_MAP: Record<string, string> = {
  primary: 'var(--color-primary)', success: 'var(--color-success)',
  warning: 'var(--color-warning)', danger: 'var(--color-danger)', muted: 'var(--color-muted)',
}

interface LinkedListRendererProps {
  visualState: VisualState
  currentStepData: AnimationStep | null
}

export default function LinkedListRenderer({ visualState, currentStepData }: LinkedListRendererProps) {
  const { arrayData: values, colorMap } = visualState
  if (values.length === 0) return <div className="flex items-center justify-center h-full text-muted text-sm">No data</div>

  const action = currentStepData?.action
  const targets = action?.targets ?? []

  const nodeW = 14, nodeH = 9, gap = 5, startX = 3, startY = 45
  const nodes = values.map((v, i) => ({
    x: startX + i * (nodeW + gap), y: startY, w: nodeW, h: nodeH,
    val: v, idx: i, color: COLOR_MAP[colorMap.get(i) ?? 'primary'],
    isTarget: targets.includes(i),
  }))

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {nodes.map((node, i) => (
        <g key={i}>
          {/* Arrow to next */}
          {i < nodes.length - 1 && (
            <line
              x1={`${node.x + node.w}%`} y1={`${node.y + node.h / 2}%`}
              x2={`${nodes[i + 1].x}%`} y2={`${node.y + node.h / 2}%`}
              stroke="var(--color-muted)" strokeWidth="0.5"
              markerEnd="url(#arrow)"
            />
          )}
          {/* Node box */}
          <rect x={`${node.x}%`} y={`${node.y}%`} width={`${node.w}%`} height={`${node.h}%`}
            rx="2" fill={node.color} fillOpacity={node.isTarget ? 1 : 0.85}
            stroke={node.isTarget ? node.color : 'var(--color-border)'} strokeWidth="0.3"
            style={{ transition: 'fill 0.3s ease' }}
          />
          {/* Value */}
          <text x={`${node.x + node.w / 2}%`} y={`${node.y + node.h / 2 + 0.5}%`}
            textAnchor="middle" dominantBaseline="central" fontSize="3" fontWeight="600"
            fill="white" fontFamily="var(--font-code)">{node.val}</text>
          {/* Index */}
          <text x={`${node.x + node.w / 2}%`} y={`${node.y + node.h + 2}%`}
            textAnchor="middle" fontSize="2" fill="var(--color-muted)" fontFamily="var(--font-code)">{node.idx}</text>
        </g>
      ))}
      <defs>
        <marker id="arrow" viewBox="0 0 6 6" refX="6" refY="3" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--color-muted)" />
        </marker>
      </defs>
    </svg>
  )
}
