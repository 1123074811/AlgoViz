import type { SceneCell } from '../types'
import { SEMANTIC_COLORS, NEUTRALS } from '../tokens'

interface HashTableViewProps {
  buckets: SceneCell[]
  entries: SceneCell[]
  loadFactorCell?: SceneCell
  hideTitle?: boolean
}

const STROKE = NEUTRALS.mutedText
const STROKE_WIDTH = 1.6
const CHAIN_COLOR = NEUTRALS.frameStroke

/**
 * Structural overlay for the dedicated hash-table visual. The bucket/entry cell
 * bodies are drawn by CellView (main scene loop); this component draws only the
 * extra structure — bucket array frame, per-bucket index labels, chain-link
 * connectors (separate chaining), and the load-factor panel. Mirrors the
 * ContainerView "draw shell, not cells" convention.
 */
export default function HashTableView({ buckets, entries, loadFactorCell, hideTitle }: HashTableViewProps) {
  if (buckets.length === 0) return null

  const sorted = [...buckets].sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  const bucketW = sorted[0].size?.width ?? 56
  const bucketH = sorted[0].size?.height ?? 44

  // Group entries by bucket index (from meta.bucket, fallback to id parse)
  const byBucket = new Map<number, SceneCell[]>()
  for (const e of entries) {
    const b = bucketOf(e)
    if (b === undefined) continue
    if (!byBucket.has(b)) byBucket.set(b, [])
    byBucket.get(b)!.push(e)
  }
  for (const list of byBucket.values()) {
    list.sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
  }

  // Bucket array bounding frame
  const minX = Math.min(...sorted.map(c => c.position.x - bucketW / 2))
  const maxX = Math.max(...sorted.map(c => c.position.x + bucketW / 2))
  const frameY = sorted[0].position.y - bucketH / 2
  const pad = 6

  // Load factor text + position
  const lf = loadFactorCell?.value?.toString()
    ?? `${entries.length}/${sorted.length}`
  const lfX = loadFactorCell?.position.x ?? maxX + 40
  const lfY = sorted[0].position.y

  return (
    <g>
      {/* Bucket array outer frame */}
      <rect
        x={minX - pad} y={frameY - pad}
        width={maxX - minX + 2 * pad} height={bucketH + 2 * pad}
        rx={8} ry={8}
        fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeDasharray="5 3" opacity={0.7}
      />
      {!hideTitle && (
        <text
          x={minX - pad} y={frameY - pad - 26}
          textAnchor="start" fontSize="12" fill={NEUTRALS.labelText} fontFamily="monospace" fontWeight={600}
        >
          哈希表·链地址法
        </text>
      )}

      {/* Per-bucket index labels (above each bucket) */}
      {sorted.map(b => (
        <text
          key={`idx_${b.id}`}
          x={b.position.x} y={b.position.y - bucketH / 2 - 8}
          textAnchor="middle" fontSize="11" fill={NEUTRALS.mutedText} fontFamily="monospace"
        >
          {b.col ?? bucketOfId(b.id)}
        </text>
      ))}

      {/* Chain connectors: bucket → entry0 → entry1 ... (separate chaining) */}
      {sorted.map(b => {
        const idx = b.col ?? bucketOfId(b.id) ?? -1
        const chain = byBucket.get(idx) ?? []
        if (chain.length === 0) return null
        const segments: JSX.Element[] = []
        // bucket bottom → first entry top
        let prevX = b.position.x
        let prevYBottom = b.position.y + bucketH / 2
        chain.forEach((e, i) => {
          const eH = e.size?.height ?? 40
          const eTop = e.position.y - eH / 2
          segments.push(
            <line
              key={`chain_${b.id}_${i}`}
              x1={prevX} y1={prevYBottom} x2={e.position.x} y2={eTop}
              stroke={CHAIN_COLOR} strokeWidth={2} strokeLinecap="round"
            />,
          )
          // small node dot at the junction toward the entry
          prevX = e.position.x
          prevYBottom = e.position.y + eH / 2
        })
        return <g key={`chainset_${b.id}`}>{segments}</g>
      })}

      {/* Load factor panel (centered on the load-factor cell position) */}
      <g transform={`translate(${lfX}, ${lfY})`}>
        <rect x={-60} y={-bucketH / 2} width={120} height={bucketH} rx={8}
          fill={SEMANTIC_COLORS.idle.fill} stroke={SEMANTIC_COLORS.idle.stroke} strokeWidth={1.2} />
        <text x={0} y={-3} textAnchor="middle" fontSize="10" fill={NEUTRALS.mutedText} fontFamily="monospace">
          负载因子
        </text>
        <text x={0} y={14} textAnchor="middle" fontSize="14" fill={NEUTRALS.bodyText} fontFamily="monospace" fontWeight={600}>
          {lf}
        </text>
      </g>
    </g>
  )
}

function bucketOf(cell: SceneCell): number | undefined {
  const meta = cell.meta as { bucket?: number } | undefined
  if (meta?.bucket !== undefined) return meta.bucket
  return bucketOfId(cell.id)
}

function bucketOfId(id: string): number | undefined {
  // hashbucket_<i> or hashentry_<bucket>_<chainIdx>
  const parts = id.split('_')
  const n = parseInt(parts[1] ?? '', 10)
  return Number.isNaN(n) ? undefined : n
}
