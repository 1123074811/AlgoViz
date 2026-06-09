import type { SceneCell, SceneNode, SceneState } from '../types'
import { NEUTRALS } from '../tokens'

const GROUP_PALETTE = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D']

interface Props { marker: SceneCell; scene: SceneState }
interface Model { discLow: Record<string, [number, number]>; stack: string[]; components: Record<string, number> }

export default function GraphAnalysisView({ marker, scene }: Props) {
  const model = (marker.meta ?? {}) as Partial<Model>
  const discLow = model.discLow ?? {}
  const stack = model.stack ?? []
  const components = model.components ?? {}

  const graphNodes = Object.values(scene.entities).filter(
    (e): e is SceneNode => e.type === 'node' && e.variant.startsWith('graph.'),
  )

  return (
    <g className="graph-analysis-view">
      {/* 分组环 + disc/low 标注 */}
      {graphNodes.map(n => {
        const dl = discLow[n.id]
        const g = components[n.id]
        const r = (n.size?.width ?? 44) / 2 + 6
        return (
          <g key={`gan_${n.id}`}>
            {g !== undefined && (
              <circle cx={n.position.x} cy={n.position.y} r={r} fill="none" stroke={GROUP_PALETTE[g % GROUP_PALETTE.length]} strokeWidth={2.4} strokeOpacity={0.85} />
            )}
            {dl && (
              <text x={n.position.x} y={n.position.y - r - 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={NEUTRALS.bodyText}>
                {`${dl[0]}/${dl[1]}`}
              </text>
            )}
          </g>
        )
      })}
      {/* DFS 栈面板 */}
      {stack.length > 0 && (
        <g>
          <text x={40} y={40} fontSize={11} fontFamily="monospace" fill={NEUTRALS.labelText}>DFS 栈</text>
          {stack.map((id, i) => (
            <g key={`ganstk_${i}`}>
              <rect x={32} y={48 + (stack.length - 1 - i) * 30} width={56} height={26} rx={4} fill={NEUTRALS.surface} stroke={NEUTRALS.frameStroke} strokeWidth={1} />
              <text x={60} y={48 + (stack.length - 1 - i) * 30 + 17} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={NEUTRALS.bodyText}>{id}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  )
}
